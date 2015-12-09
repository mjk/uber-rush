'use strict';

var _ = require('lodash');
var util = require('util');
var async = require('async');
var events = require('events');
var rest = require('restling');
var nconf = require('nconf');

var Quote = require('./Quote');
var Location = require('./Location');
var Dropoff = require('./Dropoff');
var Pickup = require('./Pickup');
var Item = require('./Item');
var API = require('./ApiRequest');

const DELIVERY_UPDATE_INTERVAL_SECONDS = 10;

/**
 * Create a new delivery.
 *
 * @param options.pickup Location Location object defining where to pick up this delivery.
 * @param options.dropoff Location Location object defining where to drop off this delivery.
 *
 */
function Delivery(options) {
    var self = this;
    events.EventEmitter.call(self);

    self.items = [];
    if (options.pickup) this.setPickup(options.pickup);
    if (options.dropoff) this.setDropoff(options.dropoff);
}
util.inherits(Delivery, events.EventEmitter);


Delivery.prototype.check = function() {
    if (this.delivery_id) throw new Error("Delivery in progress; no changes possible"); 
};

Delivery.prototype.addItem = function(item) {
    this.check();
    if (item instanceof Item) this.items.push(item);
    console.log('Added item', item);
};

Delivery.prototype.setPickup = function(pickup) {
    this.check();
    if (pickup instanceof Location) this.pickup = new Pickup({location: pickup});
    else if (pickup instanceof Pickup) this.pickup = pickup;
    else this.pickup = new Pickup(pickup);
};

Delivery.prototype.setDropoff = function(dropoff) {
    this.check();
    if (dropoff instanceof Location) this.dropoff = new Dropoff({location: dropoff});
    else if (dropoff instanceof Dropoff) this.dropoff = dropoff;
    else this.dropoff = new Dropoff(dropoff);
};

Delivery.prototype.addSpecialInstructions = function(special) {
    this.check();
    this.special_instructions = special;
};

Delivery.prototype.requireSignature = function(sig) {
    this.check();
    if (sig === undefined) this.signature_required = true;
    else this.require_signature = sig;
};


Delivery.prototype.quote = function(quote) {
    var self = this;
    self.check();

    if (!quote) quote = {};
    if (!quote.pickup) quote.pickup = self.pickup;
    if (!quote.dropoff) quote.dropoff = self.dropoff;

    if (!(quote.pickup instanceof Pickup)) {
        throw new Error("Pickup location missing");
    }

    if (!(quote.dropoff instanceof Dropoff)) {
        throw new Error("Dropoff location missing");
    }

    console.log('Posting', quote);
    return API.post('deliveries/quote', quote)
    .then(function(result) {
        if (result.response.statusCode == 201) {
            var data = (result.data||{}).quotes;
            var quotes = [];
            console.log('For quote request',data,'....');
            _.each(data, function(val, idx) {
                if (idx === 0) {
                    self.quote_id = val.quote_id; 
                }
                quotes.push(new Quote(val));
            });
            console.log('Received quotes',quotes);
            return quotes;
        } else {
            throw new Error("Quote failed");
        }
    }, function(error) {
        throw new Error("Quote failed: " + error.response.raw);
    });
};

Delivery.prototype.confirm = function(options) {
    if (!options) options = {};

    var self = this;

    // POST api.uber.com/v1/deliveries
    console.log('Creating delivery');
    API.post('deliveries', {
        quote_id: options.quote_id || self.quote_id,
        order_reference_id: options.order_reference_id || self.order_reference_id,
        items: self.items,
        pickup: options.pickup || self.pickup,
        dropoff: options.dropoff || self.dropoff
    }).then(function(result) {
        if (result.response.statusCode == 200 || result.response.statusCode == 201) {
            var data = result.data;
            console.log('Data', data);
            _.each(data, function(val, key) {
                switch(key) {
                    case 'courier': 
                        val = new Courier(val);
                        break;

                    case 'items': 
                        var items = [];
                        _.each(val, function(value) {
                            items.push(new Item(value));
                        });
                        val = items;
                        break;

                    case 'dropoff':
                        val = new Dropoff(val);
                        break;

                    case 'pickup':
                        val = new Pickup(val);
                        break;
                }

                self[key] = val;
            });

            // stored on delivery after reception:
            // - fee
            // - items
            // - order_reference_id

            self.emit('dropoff_eta', self.dropoff.eta);
            self.emit('pickup_eta', self.pickup.eta);
            self.emit('status', self.status);

            self.updateStatus();
            console.log('Delivery created', result);
        }
        else {
            log.error('Uber API unable to create delivery.', result);
            throw new Error(result);
        }
    });
};

Delivery.prototype.complete = function(status) {
    clearInterval(this.delivering);
    delete this.delivering;
    this.courier.done();
};

Delivery.prototype.updateStatus = function() {
    var self = this;

    if (self.delivering) clearInterval(self.delivering);
    self.delivering = setInterval(function() {
        API.get('deliveries/'+(elf.delivery_id)).then(function(data) {
            if (!self.courier) {
                self.courier = new Courier(data.courier); 
                self.courier.on('moved', function(data) {
                    self.emit('location', data);
                });
            }
            else {
                self.courier.update(data.courier);
            }

            switch (data.status) {
                case 'completed':
                case 'returned':
                case 'client_canceled':
                    self.complete(status);
                default:
                    self.emit('status', data.status);
            }
        });
    }, DELIVERY_UPDATE_INTERVAL_SECONDS * 1000)
};


Delivery.list = function() {
    API.get('deliveries').then(function(result) {
        var rv = [];
        for (var i = 0; i < result.length; i++) {
            rv.push(new Delivery(result[i]));
        }
        return rv;
    }, function() {
        return [];
    });
}

module.exports = Delivery;

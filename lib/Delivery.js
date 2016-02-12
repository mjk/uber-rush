'use strict';

var _ = require('lodash');
var util = require('util');
var async = require('async');
var events = require('events');
var rest = require('restling');
var nconf = require('nconf');
var Q = require('q');

var Quote = require('./Quote');
var Location = require('./Location');
var Dropoff = require('./Dropoff');
var Pickup = require('./Pickup');
var Courier = require('./Courier');
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

    this.log = (nconf.get('uber_api_debug') ? console.log.bind(console) : function () {});

    self.items = [];
    if (options.pickup) this.setPickup(options.pickup);
    if (options.dropoff) this.setDropoff(options.dropoff);
    if (options.delivery_id) this.delivery_id = options.delivery_id;
    if (options.order_reference_id) this.order_reference_id = options.order_reference_id;
}

util.inherits(Delivery, events.EventEmitter);


Delivery.prototype.check = function() {
    if (this.delivery_id) throw new Error("Delivery in progress; no changes possible");
};

Delivery.prototype.addItem = function(item) {
    this.check();
    if (item instanceof Item) this.items.push(item);
    this.log('Added item', item);
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

    this.log('Posting', quote);
    return API.post('deliveries/quote', quote)
    .then(function(result) {
        if (result.response.statusCode == 201) {
            var data = (result.data||{}).quotes;
            var quotes = [];
            self.log('For quote request',data,'....');
            _.each(data, function(val, idx) {
                if (idx === 0) {
                    self.quote_id = val.quote_id;
                }
                quotes.push(new Quote(val));
            });
            self.log('Received quotes',quotes);
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
    this.log('Creating delivery');
    return API.post('deliveries', {
        quote_id: options.quote_id || self.quote_id,
        order_reference_id: options.order_reference_id || self.order_reference_id,
        items: self.items,
        pickup: options.pickup || self.pickup,
        dropoff: options.dropoff || self.dropoff
    }).then(function(result) {
        if (result.response.statusCode == 200 || result.response.statusCode == 201) {
            var data = result.data;
            self.log('Delivery confirmed', data);
            _.each(data, function(val, key) {
                switch(key) {
                    case 'courier':
                        val = new Courier(val);
                        if (self.extrapolate) val.extrapolate = true;
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
            // - delivery_id

            self.emit('dropoff_eta', self.dropoff.eta);
            self.emit('pickup_eta', self.pickup.eta);
            self.emit('status', self.status);

            self.log('Updating status');
            self.updateStatus();
            self.log('Delivery created', self.delivery_id);

            var simulate = nconf.get('uber_api_simulate') || false;
            self.log('simulation', simulate);

            if (simulate) {
                self.simulate(simulate);
            }

            return self;
        }
        else {
            self.log('Uber API unable to create delivery.', result);
            throw new Error(result);
        }
    });
};

function stopDelivering(delivery) {
    if (delivery.delivering) {
        clearInterval(delivery.delivering);
        delete delivery.delivering;
    }
}

Delivery.prototype.complete = function(status) {
    stopDelivering(this);
    if (this.courier) this.courier.done();
};

Delivery.prototype.cancel = function(status) {
    var self = this;
    stopDelivering(this);

    return API.post('deliveries/'+(self.delivery_id)+'/cancel').then(function() {
        self.log('Canceled #'+ self.delivery_id);
        return self;
    });
};

function pollDeliveryStatus(delivery) {
    return API.get('deliveries/'+(delivery.delivery_id)).then(function(data) {
        delivery.log('Receive API delivery data', data);

        var status = (data||{}).status || 'unknown';
        if (!delivery.courier) {
            delivery.courier = new Courier(data.courier);
            delivery.courier.on('moved', function(data) {
                delivery.emit('location', data);
            });
        }
        else {
            delivery.courier.update(data.courier);
        }

        delivery.status = data.status;
        delivery.pickup.eta = data.pickup.eta;
        delivery.dropoff.eta = data.dropoff.eta;

        switch (data.status) {
            case 'completed':
            case 'returned':
            case 'client_canceled':
            case 'no_couriers_available':
            case 'unable_to_deliver':
                // terminal statuses: we stop polling if we receive one of these
                delivery.complete(status);
        }

        delivery.emit('status', status);
    })
    .catch(function (err) {
          delivery.log(err.message, err.stack);
          throw err;
    });
}

Delivery.prototype.simulate = function(delay) {
    var statuses = ['en_route_to_pickup', 'at_pickup', 'en_route_to_dropoff', 'at_dropoff', 'completed'];
    //var statuses = ['no_couriers_available'];

    var self = this;
    var i = 0;
    if (isNaN(delay) || delay == 0) delay = 30*1000;

    var update = setInterval(function() {
        if (!self.delivering) {
            clearInterval(update);
        } else if (i >= statuses.length) {
            clearInterval(update);
        } else {
            self.updateStatus(statuses[i++]);
        }
    }, delay);

    this.log('simulating delivery with a delay of ' + Math.ceil(delay/1000.00) + 's between stages');
};

Delivery.prototype.updateStatus = function(status) {
    var self = this;
    var blockUpdate = Q(true);

    if (status) {
        // sandbox testing
        this.log('updating status for sandbox testing (delivery_id='+self.delivery_id+'; status='+status+')');
        blockUpdate = API.put('sandbox/deliveries/'+self.delivery_id, {
            status: status
        });
    }

    blockUpdate.then(function() {
        if (self.delivering) clearInterval(self.delivering);
        self.delivering = setInterval(function() {
            pollDeliveryStatus(self); // TODO just bind this
        }, DELIVERY_UPDATE_INTERVAL_SECONDS * 1000);
    });
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
};

module.exports = Delivery;

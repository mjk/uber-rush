'use strict';

const _ = require('lodash');
const util = require('util');
const async = require('async');
const events = require('events');
const EventEmitter = events.EventEmitter;
const rest = require('restling');
const nconf = require('nconf');
const Q = require('q');

const Quote = require('./Quote');
const Location = require('./Location');
const Dropoff = require('./Dropoff');
const Pickup = require('./Pickup');
const Courier = require('./Courier');
const Item = require('./Item');
const API = require('./ApiRequest');

const DEFAULT_UPDATE_INTERVAL_SECONDS = 30;
const SIMULATION_UPDATE_INTERVAL_SECONDS = 30;

// Maximum number of consecutive polling failures allowed before disabling
const MAX_UPDATE_FAILURES = 10;

/**
 * Create a new delivery.
 *
 * @param options.pickup Location Location object defining where to pick up this delivery.
 * @param options.dropoff Location Location object defining where to drop off this delivery.
 *
 */
class Delivery extends EventEmitter {
  constructor(options) {
    super();
    EventEmitter.call(this);
    if (!options) options = {};

    this.log = (nconf.get('uber_api_debug') ? console.log.bind(console) : function () {});
    this.items = [];
    this.pollingFailures = 0;
    this.updateInterval = (nconf.get('uber_api_polling_interval_secs') || DEFAULT_UPDATE_INTERVAL_SECONDS);

    if (options.pickup) this.setPickup(options.pickup);
    if (options.dropoff) this.setDropoff(options.dropoff);
    if (options.delivery_id) this.delivery_id = options.delivery_id;
    if (options.order_reference_id) this.order_reference_id = options.order_reference_id;
  }

  addItem(item) {
    preventDeliveryChanges(this);
    this.items.push(item instanceof Item ? item : new Item(item));
    this.log('Added item', item);
  }

  setPickup(pickup) {
    preventDeliveryChanges(this);
    if (pickup instanceof Location) this.pickup = new Pickup({location: pickup});
    else if (pickup instanceof Pickup) this.pickup = pickup;
    else this.pickup = new Pickup(pickup);
  }

  setDropoff(dropoff) {
    preventDeliveryChanges(this);
    if (dropoff instanceof Location) this.dropoff = new Dropoff({location: dropoff});
    else if (dropoff instanceof Dropoff) this.dropoff = dropoff;
    else this.dropoff = new Dropoff(dropoff);
  }

  addSpecialInstructions(special) {
    preventDeliveryChanges(this);
    this.special_instructions = special;
  }

  requireSignature(sig) {
    preventDeliveryChanges(this);
    if (sig === undefined) this.signature_required = true;
    else this.require_signature = sig;
  }

  quote(quote) {
    preventDeliveryChanges(this);

    if (!quote) quote = {};
    if (!quote.pickup) quote.pickup = this.pickup;
    if (!quote.dropoff) quote.dropoff = this.dropoff;

    if (!(quote.pickup instanceof Pickup)) {
      throw new Error("Pickup location missing");
    }

    if (!(quote.dropoff instanceof Dropoff)) {
      throw new Error("Dropoff location missing");
    }

    this.log('Posting', quote);
    const self = this;

    return API.post('deliveries/quote', quote)
    .then(function(result) {
      if (result.response.statusCode == 201) {
        const data = (result.data||{}).quotes;
        let quotes = [];
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
  }

  confirm(options) {
    if (!options) options = {};

    const self = this;

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
        const data = result.data;
        self.log('Delivery confirmed', data);
        _.each(data, function(val, key) {
          switch(key) {
            case 'courier':
              if (self.extrapolate) val.extrapolate = true;
              val = new Courier(val);
              break;

            case 'items':
              let items = [];
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

        const simulate = nconf.get('uber_api_simulate') || false;
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
  }

  getPossibleStatuses() {
    return ['en_route_to_pickup', 'at_pickup', 'en_route_to_dropoff', 'at_dropoff', 'completed'];
  }

  simulate(delay) {
    const statuses = this.getPossibleStatuses();
    //const statuses = ['no_couriers_available'];
    const self = this;

    let i = 0;
    if (typeof delay !== 'number' || delay === 0) delay = SIMULATION_UPDATE_INTERVAL_SECONDS*1000;

    let update = setInterval(function() {
      if (!self.delivering) {
        clearInterval(update);
      } else if (i >= statuses.length) {
        clearInterval(update);
      } else {
        self.updateStatus(statuses[i++]);
        if (statuses[i-1] == 'en_route_to_dropoff') {
          // next status is dropoff
          // so we need to animate the delivery

          //self.courier.extrapolate = true;
          //self.courier.setLocation(self.pickup);
        }
      }
    }, delay);

    this.log('simulating delivery with a delay of ' + Math.ceil(delay/1000.00) + 's between stages');
  }

  updateStatus(status) {
    const self = this;

    // Check if we've reached the maximum number of allowed failures, clear
    // the polling interview
    if (this.pollingFailures > MAX_UPDATE_FAILURES) {
      return stopDelivering(self);
    }

    let blockUpdate = Q(true);

    if (status) {
      // sandbox testing
      this.log('updating status for sandbox testing (delivery_id='+this.delivery_id+'; status='+status+')');
      blockUpdate = API.put('sandbox/deliveries/'+this.delivery_id, {
        status: status
      });
    }

    blockUpdate.then(() => {
      // Exponential decay on time between failed status poll requests
      const interval = self.updateInterval * Math.pow(2, self.pollingFailures) * 1000;

      if (self.delivering) clearInterval(self.delivering);
      self.delivering = setInterval(() => this.updateDeliveryInfo(), interval);
    });
  }

  /**
   * Call the delivery API for the latest information on this order
   */
  updateDeliveryInfo() {
    this.log('polling this status');

    return API
      .get(`deliveries/${this.delivery_id}`)
      .then(data => {
        this.log('Receive API this data', data);

        // Reset the number of failures when we successfully poll uber
        this.pollingFailures = 0;

        if (!this.courier) {
          this.courier = new Courier(data.courier);
          this.courier.on('moved', data => this.emit('location', data));
        }
        else {
          this.courier.update(data.courier);
        }

        if (!this.pickup && data.pickup) {
          this.pickup = new Pickup(data.pickup);
          this.pickup.eta = data.pickup.eta;
        }

        if (!this.dropoff && data.dropoff) {
          this.dropoff = new Dropoff(data.dropoff);
          this.dropoff.eta = data.dropoff.eta;
        }

        const status = (data || {}).status || 'unknown';
        this.status = data.status;

        // Emit the status event before determining if the current status is terminal
        this.emit('status', status);

        switch (data.status) {
          case 'completed':
          case 'returned':
          case 'client_canceled':
          case 'no_couriers_available':
          case 'unable_to_deliver':
            // terminal statuses: we stop polling if we receive one of these
            this.complete(status);
        }
      })
      .catch(err => {
        // Increment the number of polling failures on failure
        this.pollingFailures += 1;
        this.log(err.message, err.stack);
        throw err;
      });
  }

  complete() {
    stopDelivering(this);
    if (this.courier) this.courier.done();
  }

  cancel() {
    stopDelivering(this);

    return API.post(`deliveries/${this.delivery_id}/cancel`).then(() => {
        this.log('Canceled #'+ this.delivery_id);
        return this;
    });
  }
}

Delivery.list = function() {
  API.get('deliveries').then(function(result) {
    let rv = [];
    for (let i = 0; i < result.length; i++) {
      rv.push(new Delivery(result[i]));
    }
    return rv;
  }, function() {
    return [];
  });
};

function stopDelivering(delivery) {
  if (delivery.delivering) {
    clearInterval(delivery.delivering);
    delete delivery.delivering;

    delivery.removeAllListeners();
  }
}

function preventDeliveryChanges(delivery) {
  if (delivery.delivery_id) throw new Error("Delivery in progress; no changes possible");
}
module.exports = Delivery;

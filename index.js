'use strict';
const nconf = require('nconf');
const _ = require('lodash');
const API = require('./lib/ApiRequest');

const Delivery = require('./lib/Delivery');
const Location = require('./lib/Location');
const Quote = require('./lib/Quote');
const Item = require('./lib/Item');
const Contact = require('./lib/Contact');

const DEFAULT_OPTIONS = {
  polling_interval_secs: 30,
  simulation_interval_secs: 30
};

class UberRUSHClient {
  constructor(options) {
    if (!options.client_secret) throw new Error("client_secret must be provided");
    if (!options.client_id) throw new Error("client_id must be provided");

    options = Object.assign(DEFAULT_OPTIONS, options);
    Object.assign(this, options);

    const sandbox = options.sandbox || !options.production;
    const scope = (sandbox ? 'delivery_sandbox' : 'delivery');

    nconf.use('memory');

    nconf.set('uber_api_client_secret', options.client_secret);
    nconf.set('uber_api_client_id', options.client_id);
    nconf.set('uber_api_server_token', options.server_token);
    nconf.set('uber_api_sandbox', sandbox);
    nconf.set('uber_api_simulate', options.simulate);
    nconf.set('uber_api_debug', options.debug);
    nconf.set('uber_api_scope', scope);
    nconf.set('uber_api_polling_interval_secs', options.polling_interval_secs);

    if (options.debug) {
      console.log(
        'Initializing uber in', (sandbox ? 'sandbox' : 'production'),
        'mode with scope:', scope
      );
    }

    if (!options.no_preload)
      this._authenticationPromise = API.getToken();
  }

  createDelivery(options) {
    options.debug = options.debug || this.debug;
    return new Delivery(options);
  }

  setSimulationInterval(interval) {
    nconf.set('uber_api_simulate', interval);
  }
}

UberRUSHClient.Delivery = Delivery;
UberRUSHClient.Item = Item;
UberRUSHClient.Quote = Quote;
UberRUSHClient.Contact = Contact;
UberRUSHClient.createClient = function(options) {
  return new UberRUSHClient(options);
};

module.exports = UberRUSHClient;

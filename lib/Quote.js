'use strict';

var _ = require('lodash');
var util = require('util');
var async = require('async');
var events = require('events');

var Location = require('./Location');

/**
 * A delivery quote.
 *
 * @param quote_id string The ID of the quote.
 * @param estimated_at integer Unix timestamp of the time this quote was generated.
 * @param start_time integer Unix timestamp of the start of the delivery window.
 * @param end_time integer Unix timestamp of the end of the delivery window.
 * @param fee float The fee of the delivery.
 * @param currency_code string The currency code of the delivery fee. The currency code follows the ISO 4217 standard.
 * @param pickup_eta integer The eta to pickup for this quote in minutes. Only applies to on­demand deliveries.
 * @param dropoff_eta integer The eta to dropoff for this quote in minutes. Only applies to on­demand deliveries.
 *
 */
function Quote(options) {
    var self = this;
    events.EventEmitter.call(self);

    this.quote_id = options.quote_id;
    this.start_time = new Date(parseInt(options.start_time,10)*1000);
    this.end_time = new Date(parseInt(options.start_time,10)*1000);
    this.fee = parseFloat(options.fee);
    this.currency_code = options.currency_code;

    if (options.pickup_eta) this.pickup_eta = parseInt(options.pickup_eta, 10);
    if (options.dropoff_eta) this.dropoff_eta = parseInt(options.dropoff_eta, 10);

    this.pickup_date = this.pickup_eta ? new Date(Date.now() + this.pickup_eta*60*1000) : null;
    this.dropoff_date = this.dropoff_eta ? new Date(Date.now() + this.dropoff_eta*60*1000) : null;
}
util.inherits(Quote, events.EventEmitter);

module.exports = Quote;

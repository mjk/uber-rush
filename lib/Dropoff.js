'use strict';

var _ = require('lodash');
var Contact = require('./Contact');
var Item = require('./Item');
var Location = require('./Location');

/**
  A configured dropoff.

  @param contact Contact Contact person for the dropoff
  @param location Location Location address for the dropoff
  @param signature_required boolean 
  @param special_instructions string
*/

function Dropoff(options) {
    var self = this;

    _.each(options, function(value, key) {
        if (key == 'contact') {
            value = new Contact(value);
        }
        else if (key == 'location') {
            value = new Location(value);
        }
        else if (key == 'eta') {
            value = parseInt(key, 10);
        }

        self[key] = value;
    });
}

Dropoff.prototype.check = function() {
    if (this.eta) throw new Error('Delivery in progress; dropoff cannot be modified');
};

module.exports = Dropoff;

'use strict';

var _ = require('lodash');
var Contact = require('./Contact');
var Item = require('./Item');
var Location = require('./Location');

/**
  A configured pickup.

  @param contact Contact Contact person for the dropoff
  @param location Location Location address for the dropoff
  @param signature_required boolean 
  @param special_instructions string
*/

class Pickup {
  constructor(options) {
    _.each(options, (value, key) => {
      if (key == 'contact') {
        value = new Contact(value);
      }
      else if (key == 'location') {
        value = new Location(value);
      }
      else if (key == 'eta') {
        value = parseInt(key, 10);
      }

      this[key] = value;
    });
  }

  check() {
    if (this.eta) throw new Error('Delivery in progress; pickup cannot be modified');
  }
}

module.exports = Pickup;

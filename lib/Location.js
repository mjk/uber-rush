'use strict';

const _ = require('lodash');

/**
  A location.

  @param options.address string The top address line of the delivery pickup options.
  @param options.address_2 string The second address line of the delivery pickup options such as the apartment number. This field is optional.
  @param options.city string The city of the delivery pickup options.
  @param options.state string The state of the delivery pickup options such as “CA”.
  @param options.postal_code string The postal code of the delivery pickup options.
  @param options.country string The country of the delivery pickup options such as “US".
*/

class Location {
  constructor(options) {
    _.each(options, (value, key) => {
      if (key == 'country') {
        if (!value || value.length != 2) return false;
      }

      this[key] = value;
    });
  }
}

module.exports = Location;

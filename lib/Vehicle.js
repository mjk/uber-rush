'use strict';

var _ = require('lodash');

/**
  A vehicle.

  @param license_plate string License plate; e.g., RUSHNYC
  @param make string vehicle brand; e.g., Acura
  @param model string vehicle model; e.g., ZDX
  @param picture_url uri picture of vehicle
*/

class Vehicle {
  constructor (options) {
    _.each(options, (value, key) => {
        this[key] = value;
    });
  }
}

module.exports = Vehicle;

'use strict';

var _ = require('lodash');
var events = require('events');
var util = require('util');

/**
  A courier.

  @param location object {
      "latitude":40.7619629893,
      "longitude":-74.0014480227,
      "bearing":33
  }

  @param name string Name of the courier, e.g. Rob
  @param phone string Phone number of the courier, e.g. +12155551212
  @param picture_url uri URI to a photo of the courier
  @param vehicle Vehicle object
*/

function Courier(options) {
    var self = this;
    events.EventEmitter.call(self);

    _.each(options, function(value, key) {
        if (key == 'vehicle')
            self.setVehicle(value);
        else self[key] = value;
    });
}
util.inherits(Courier, events.EventEmitter);

Courier.prototype.setVehicle = function(vehicle) {
    if (!(vehicle instanceof Vehicle)) {
        vehicle = new Vehicle(vehicle);
    }
    this.vehicle = vehicle;

    this.emit('vehicle', vehicle);
};

Courier.prototype.getLocation = function() {
    return this.location;
}

Courier.prototype.setLocation = function(location) {
    if (!this.location) this.location = {
        latitude: 0,
        longitude: 0,
        bearing: 0
    };

    this.location.latitude = location.latitude;
    this.location.longitude = location.longitude;
    this.location.bearing = location.bearing;

    this.emit('moved', this.location);
};

// couriers might change, so we do need to be able to update all fields while maintaining this object during a delivery for subscribers' sakes
Courier.prototype.update = function(courierRecord) {
    var self = this;

    _(courierRecord).each(function(value, key) {
        if (key == 'location') self.setLocation(value);
        if (key == 'vehicle') self.setVehicle(value);
        else self[key] = value;
    });
};

Courier.prototype.done = function() {
    this.removeAllListeners();
}; 

module.exports = Courier;

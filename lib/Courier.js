'use strict';

var _ = require('lodash');
var events = require('events');
var util = require('util');

var Vehicle = require('./Vehicle.js');

var mps = 10 / 60 / 60;
var fps = 30;

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
};

Courier.prototype.predictNextLocation = function(time, speed, location) {
    var next = {latitude: (location || this.location).latitude,
                longitude: (location || this.location).longitude,
                bearing: (location || this.location).bearing};

                // time must be in seconds
                // speed in meters per second? no, in some other metric
    var distance = time * speed;

    var radbearing = next.bearing / (2*Math.PI);
    var lat = distance * Math.sin(radbearing);
    var lon = distance * Math.cos(radbearing);

    next.latitude += lat;
    next.longitude += lon;

    return next;
};

Courier.prototype.setLocation = function(location) {
    var self = this;

    if (self.extrapolation) clearInterval(self.extrapolation);
    if (!self.location) self.location = {
        latitude: 0,
        longitude: 0,
        bearing: 0
    };

    self.location.latitude = location.latitude;
    self.location.longitude = location.longitude;
    self.location.bearing = location.bearing;

    self.emit('moved', self.location);

    if (self.extrapolate) {
        var nextLocation;
        self.extrapolation = setInterval(function() {
            nextLocation = self.predictNextLocation(1.0/fps, mps, nextLocation);
            self.emit('moved', nextLocation);
        }, 1.0/fps);

    }
};

// couriers might change, so we do need to be able to update all fields while maintaining this object during a delivery for subscribers' sakes
Courier.prototype.update = function(courierRecord) {
    var self = this;

    _.each(courierRecord, function(value, key) {
        if (key == 'location') self.setLocation(value);
        if (key == 'vehicle') self.setVehicle(value);
        else self[key] = value;
    });
};

Courier.prototype.done = function() {
    this.removeAllListeners();
};

module.exports = Courier;

'use strict';

const _ = require('lodash');
const events = require('events');
const util = require('util');
const geodesy = require('./GeodesyWrapper');
const LatLon = geodesy.LatLonSpherical;

const Vehicle = require('./Vehicle.js');

// meters per second traveled by bike 
const mps = 5000 / 60 / 60;
// frames per second -- how frequently to issue updates to courier animation
const fps = 1;

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

class Courier extends events.EventEmitter {
  constructor(options) {
    super();
    events.EventEmitter.call(this);

    _.each(options, (value, key) => {
      if (key == 'vehicle') {
        this.setVehicle(value);
      } else if (key == 'location') {
        this.location = new LatLon(value.latitude, value.longitude);
        this.location.bearing = value.bearing;
      }
      else this[key] = value;
    });

    if (false && options.extrapolate) {
      this.startPredicting();
    }
  }

  setVehicle(vehicle) {
    if (!(vehicle instanceof Vehicle)) {
      vehicle = new Vehicle(vehicle);
    }
    this.vehicle = vehicle;

    this.emit('vehicle', vehicle);
  }

  getLocation() {
    return this.location.toUber();
  }

  predictNextLocation(time, speed, location) {
    if (location) {
     if (!(location instanceof LatLon)) location = new LatLon(location.latitude || location.lat, location.longitude || location.lon);
    } else location = this.location;

    // time must be in seconds
    // speed in meters per second? yes
    //
    const distance = time * speed;
    const point = location.destinationPoint(distance, location.bearing || 0);

    return point;
  }

  setLocation(location) {
    if (this.extrapolation) clearInterval(this.extrapolation);

    this.location = location instanceof LatLon ? location : new LatLon(location.latitude || location.lat, location.longitude || location.lon);
    this.location.bearing = location.bearing || 0;

    this.emit('moved', this.location);

    if (this.extrapolate) {
      this.startPredicting();
    }
  }

  startPredicting() {
    let nextLocation;

    this.extrapolation = setInterval(() => {
      nextLocation = this.predictNextLocation(1.0/fps, mps, nextLocation);
      nextLocation.bearing = this.location.bearing;
      //console.log('moved', nextLocation.toUber());
      this.emit('moved', nextLocation.toUber());
    }, (1.0/fps)*1000);
  }

  // couriers might change, so we do need to be able to update all fields while maintaining this object during a delivery for subscribers' sakes
  update(courierRecord) {
    _.each(courierRecord, (value, key) => {
      if (key == 'location') this.setLocation(value);
      if (key == 'vehicle') this.setVehicle(value);
      else this[key] = value;
    });
  }

  done() {
    if (this.extrapolation) clearInterval(this.extrapolation);
    this.removeAllListeners();
  }
}

module.exports = Courier;

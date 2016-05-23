var geodesy = require('geodesy');

module.exports = (function() {
  geodesy.LatLonSpherical.prototype.toUber = function() {
    return {
      latitude: this.lat,
      longitude: this.lon
    }
  };
  return geodesy;
})();


'use strict';

const assert = require('assert');
const rush = require('../../index');
const config = require('../dummy/config');
const deliveryConfig = require('../dummy/delivery').fullDelivery;

describe('Contacts', function() {
  const client = rush.createClient(config);

  it('rush.Contact should exist', function() {
    assert(!!rush.Contact);
  });

  it('Contact should accept a variety of American numbers', function() {
    assert.doesNotThrow(() => {
      new rush.Contact(Object.assign(deliveryConfig.pickup.contact, {strict: 1}));
      new rush.Contact(Object.assign(deliveryConfig.dropoff.contact, {strict: 1}));
      new rush.Contact({strict: 1, phone:{number: '844-555-5555'}});
      new rush.Contact({strict: 1, phone:{number: '855-555-5555'}});
      new rush.Contact({strict: 1, phone:{number: '900-555-5555'}});
      new rush.Contact({strict: 1, phone:{number: '800-555-5555'}});
      new rush.Contact({strict: 1, phone:{number: '716-555-5555'}});
      new rush.Contact({strict: 1, phone:{number: '+1 212 555 1212'}});
      new rush.Contact({strict: 1, phone:{number: '+1 844 555 1212'}});
    });
  });

  it('Contact should not accept invalid numbers', function() {
    assert.throws(() => {
      new rush.Contact({strict: 1, phone:{number: '555 1212'}});
    });
    assert.throws(() => {
      new rush.Contact({strict: 1, phone:{number: '1 555 12'}});
    });
  });

  it('Contact should not throw invalid number errors outside of strict mode', function() {
    assert.doesNotThrow(() => {
      new rush.Contact({phone:{number: '555 1212'}});
      new rush.Contact({phone:{number: '1 555 12'}});
    });
  });
})

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
      new rush.Contact(deliveryConfig.pickup.contact);
      new rush.Contact(deliveryConfig.dropoff.contact);
      new rush.Contact({phone:{number: '844-555-5555'}});
      new rush.Contact({phone:{number: '855-555-5555'}});
      new rush.Contact({phone:{number: '900-555-5555'}});
      new rush.Contact({phone:{number: '800-555-5555'}});
      new rush.Contact({phone:{number: '716-555-5555'}});
      new rush.Contact({phone:{number: '+1 212 555 1212'}});
      new rush.Contact({phone:{number: '+1 844 555 1212'}});
    });
  });

  it('Contact should not accept invalid numbers', function() {
    assert.throws(() => {
      new rush.Contact({phone:{number: '555 1212'}});
    });
    assert.throws(() => {
      new rush.Contact({phone:{number: '1 555 12'}});
    });
  });

})

'use strict';

const assert = require('assert');
const rush = require('../../index');
const config = require('../dummy/config');

describe('testing uber-rush main sdk methods', function() {
  it('UberRUSH should exist', function() {
    assert(!!rush);
  });
  it('UberRUSH.createClient should exist', function() {
    assert(typeof rush.createClient == 'function');
  });
  it('UberRUSH.createClient should require client_secret and client_id', function() {
    assert.throws(() => {
      rush.createClient()
    });
    assert.throws(() => {
      rush.createClient({client_secret:'test'})
    });
    assert.throws(() => {
      rush.createClient({client_id:'test'})
    });
    assert.doesNotThrow(() => {
      rush.createClient(config);
    });
  });
  it('An API instance should offer createDelivery', function() {
    const client = rush.createClient(config);

    assert(typeof client.createDelivery == 'function');
  });
})

'use strict';

const assert = require('assert');
const rush = require('../../index');
const config = require('../dummy/config');
const deliveryConfig = require('../dummy/delivery').fullDelivery;

describe('testing delivery creation', function() {
  const client = rush.createClient(config);

  it('rush.Delivery should exist', function() {
    assert(!!rush.Delivery);
  });

  it('createDelivery should return a Delivery', function() {
    assert(typeof client.createDelivery == 'function');
    let delivery = client.createDelivery(deliveryConfig);

    assert(delivery instanceof rush.Delivery);

    delivery = new rush.Delivery();
    assert(delivery instanceof rush.Delivery);
  });

  it('Delivery should allow items to be added', function() {
    let delivery = new rush.Delivery();

    assert(typeof delivery.addItem == 'function');
    assert.doesNotThrow(() => {
      delivery.addItem({title: 'chocolate bar'});
    });
  });

  it('Delivery should allow pickup to be updated before confirming', function() {
    let delivery = new rush.Delivery();

    assert(typeof delivery.setPickup == 'function');
    assert.doesNotThrow(() => {
      delivery.setPickup(deliveryConfig.pickup);
    });
  });

  it('Delivery should allow dropoff to be updated before confirming', function() {
    let delivery = new rush.Delivery();

    assert(typeof delivery.setDropoff == 'function');
    assert.doesNotThrow(() => {
      delivery.setDropoff(deliveryConfig.pickup);
    });
  });

  it('Delivery should allow special instructions to be updated before confirming', function() {
    let delivery = new rush.Delivery();

    assert(typeof delivery.addSpecialInstructions == 'function');
    assert.doesNotThrow(() => {
      delivery.addSpecialInstructions('special');
    });
  });

  it('Delivery should allow signatures to be required before confirming', function() {
    let delivery = new rush.Delivery();

    assert(typeof delivery.requireSignature == 'function');
    assert.doesNotThrow(() => {
      delivery.requireSignature('special');
    });
  });

  it('Delivery should provide quote method', function() {
    let delivery = new rush.Delivery(deliveryConfig);

    assert(typeof delivery.quote == 'function');
    assert.doesNotThrow(() => {
      //delivery.quote();
    });
  });
})

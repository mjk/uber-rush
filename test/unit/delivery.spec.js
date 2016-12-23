'use strict';

const assert = require('assert');
const rush = require('../../index');
const config = require('../dummy/config');
const deliveryConfig = require('../dummy/delivery').fullDelivery;

const client = rush.createClient(config);

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

  it('Delivery should automatically add single items', function() {
    let delivery = client.createDelivery({
      item: {
        title: 'a fun item',
        quantity: 1
      }
    });

    assert(delivery.items instanceof Array);
    assert(delivery.items.length == 1);
    assert(delivery.items[0].title == 'a fun item');
  });

  it('Delivery should provide quote method', function() {
    let delivery = new rush.Delivery(deliveryConfig);

    assert(typeof delivery.quote == 'function');
    assert.doesNotThrow(() => {
      //delivery.quote();
    });
  });

  it('Delivery should provide getRatings method', function() {
    let delivery = new rush.Delivery(deliveryConfig);

    assert(typeof delivery.getRatings == 'function');
    assert.throws(() => {
      delivery.getRatings();
    });
    assert.doesNotThrow(() => {
      try {
      delivery.getRatings({delivery_id: 'foo'}).then(console.log);
      } catch (e) {
        console.error(e);
      }
    });
  });

  it('Delivery should provide rate method', function() {
    let delivery = new rush.Delivery(deliveryConfig);

    assert(typeof delivery.rate == 'function');
    assert.throws(() => {
      delivery.rate();
      delivery.rate({});
      delivery.rate({waypoint: 'foobar'});
      delivery.rate({waypoint: 'pickup', rating_type: 'five_points', rating_value: 0});
      delivery.rate({waypoint: 'pickup', rating_type: 'five_points', rating_value: true});
      delivery.rate({waypoint: 'pickup', rating_type: 'five_points', rating_value: 'abc'});
    });
    assert.doesNotThrow(() => {
      try {
      delivery.status = 'completed';
      delivery.rate({waypoint: 'pickup', rating_type: 'binary', rating_value: 0});
      delivery.rate({waypoint: 'pickup', rating_type: 'binary', rating_value: 1});
      delivery.rate({waypoint: 'pickup', rating_type: 'five_points', rating_value: 1});
      delivery.rate({waypoint: 'pickup', rating_type: 'five_points', rating_value: 2});
      delivery.rate({waypoint: 'pickup', rating_type: 'five_points', rating_value: 3});
      delivery.rate({waypoint: 'pickup', rating_type: 'five_points', rating_value: 4});
      delivery.rate({waypoint: 'pickup', rating_type: 'five_points', rating_value: 5});
      } catch (e) {
        console.error(e);
      }
    });
  });
});

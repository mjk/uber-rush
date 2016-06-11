const RUSH = require('../index');
const Item = RUSH.Item;
const Contact = RUSH.Contact;

const client = RUSH.createClient(Object.assign(require('./config'), {
    debug: true,
    simulate: 31*1000,
    sandbox: true
}));
const del = client.createDelivery({
  pickup: {
    contact: new Contact({
      first_name: 'Ryan',
      last_name: 'Cheney',
      phone: {
        number: '716-555-5000'
      }
    }),
    location: {
      address: '64 Seabring St',
      address2: '',
      city: 'Brooklyn',
      state: 'NY',
      postal_code: '11231',
      country: 'US'
    }
  },
  dropoff: {
    contact: new Contact({
      company_name: 'State of the Art Department',
      first_name: 'Karen',
      last_name: 'Holmes',
      phone: {
        number: '585-555-5000'
      }
    }),
    location: {
      address: '80 Willoughby St',
      address2: '#3B',
      city: 'Brooklyn',
      state: 'NY',
      postal_code: '11201',
      country: 'US'
    }
  }
});

console.log('TEST Created delivery object', del);

del.on('status', function(update) {
  console.log('TEST Status update; status='+update);
});

del.quote().then(function(resp) {
  console.log('TEST Got quotes',resp);
  del.addItem(new Item({
    title: 'some food',
    quantity: 1,
    price: 10,
    is_fragile: true
  }));

  console.log('TEST Confirming order');
  return del.confirm();
}, function(err) {
  console.error('TEST Quote error',err);
  throw err;
}).then(function(resp) {
  console.log('TEST Confirmed delivery');
});


# uber rush sdk

## Example

    var rush = require('uber-rush');

    rush.init({
        client_secret: YOUR_CLIENT_SECRET,
        client_id: YOUR_CLIENT_ID
    }).then(function() {
        var delivery = new rush.Delivery({
            item: {
                title: 'Delicious food',
                quantity: 1,
                is_fragile: true
            },
            pickup: {
                contact: {
                },
                location: {
                    address: '64 Seabring St',
                    city: 'Brooklyn',
                    state: 'NY',
                    postal_code: '11231',
                    country_code: 'US'
                }
            },
            dropoff: {
                contact: {
                },
                location: {
                    address: '80 Willoughby St',
                    city: 'Brooklyn',
                    state: 'NY',
                    postal_code: '11201',
                    country_code: 'US'
                }
            }
        }

        delivery.quote()
        .then(function(quote) {
            console.log('Got quotes', quote);

            delivery.addEventListener('status', function(status) {
                console.log('delivery status updated: ' + status);
            });
            delivery.addEventListener('location', function(loc) {
                console.log('delivery location updated: ', loc);
            });

            delivery.start();
        });
    }); 

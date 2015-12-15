# uber rush sdk

Node.js SDK for the UberRUSH API. Make deliveries without ever leaving your CLI.

## Prerequisites

You'll need a client ID and a client secret from Uber. Additionally, you'll probably want to test in the RUSH sandbox before you start actually make people bike around your city.

 1. Register at https://developer.uber.com
 2. Create a new app
 3. Select the delivery sandbox
 4. some more steps
 5. `npm install @mjk/uber-rush`


When using the sandbox, updated delivery statuses must be simulated by you directly, by calling `delivery.updateStatus(<new-delivery-status>);`. 

You must call each status in order.

## API reference

### rush.Delivery
### rush.Location
### rush.Quote
### rush.Item
### rush.Contact
### rush.Courier

## Getting started 

#### Step 1: Intialize the SDK
Before making API calls, you must initialize the SDK with your app's ID and secret.

    var rush = require('uber-rush')
    rush.init({
        client_secret: YOUR_CLIENT_SECRET,
        client_id: YOUR_CLIENT_ID,
        sandbox: true
    });

#### Step 2: Get a quote

Every delivery starts with a quote. Initialize a new delivery with

* a description of the item to be transported
* the pickup and the dropoff addresses
* (optionally) contact information at the pickup and drop off locations

configured in a plain old JavaScript object:


	var delivery = new rush.Delivery({
	  item: {
	      title: 'Chocolate bar',
	      quantity: 1,
	      is_fragile: true
	  },
	  pickup: {
	      contact: {
	          first_name: 'Ryan',
	          last_name: 'Cheney
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
	          first_name: 'Karen',
	          last_name: 'Holmes
	      },
	      location: {
	          address: '80 Willoughby St',
	          city: 'Brooklyn',
	          state: 'NY',
	          postal_code: '11201',
	          country_code: 'US'
	      }
	  }
	});
		
Sending the quote out for an estimate returns a [promise](https://promisesaplus.com) for an array of `rush.Quote` objects:

	delivery.quote()
	.then(function(quotes) {
		console.log('Received ' + quotes.length + ' quotes:');
		for (var i = 0; i < quotes.length; i++) console.log(quotes[i]);
	})
	.fail(function(error){
		console.log('Delivery quote error:',error);
	});

#### Step 3: Confirm the quote

The first quote in the array will be the best quote for the job. Confirming the delivery will start a biker on her journey (unless you're in the sandbox) so be sure you're ready! Before you confirm delivery, it's a good idea to subscribe to a few **events** in order to track the courier's progress.

Uber requests that we only check status every 30 seconds. If you're trying to keep up with your courier on a map, that's a slow update cycle—by default we only fire status update events on the same schedule. Set `delivery.extrapolate` to true to fire events at a high degree of fidelity, suitable for live maps. 

We simply linearly extrapolate the courier's latitude and longitude given the current location and bearing, and their average speed. Every 30 seconds, location will be updated to the official Uber data.

	delivery.on('status', function(status) {
		// fired every time the delivery status changes (see below)
		console.log('Delivery status: ' + status)
	});
	delivery.on('location', function(location) {
		/* location: {latitude: ..., longitude: ..., bearing: ...} */
		console.log('Courier location', location); 
	});
	delivery.extrapolate = true; 
	delivery.confirm();


## Events

 * **status**: 
 * **location**:


## Delivery statuses

 * **processing**: The delivery request is being processed.
 * **no_couriers_available**: The delivery request timed out with no couriers available.
 * **en_route_to_pickup**: A courier has been assigned and is en route to the pickup location.
 * **at_pickup**: The courier is at the pickup location.
 * **en_route_to_dropoff**: The courier has picked up the item and is en route to the dropoff location.
 * **at_dropoff**: The courier is at the dropoff location.
 * **completed**: The delivery has been successfully completed.
 * **client_canceled**: This delivery was canceled by merchant request. 
 * **returning**: The courier is returning the delivery to the pickup location.
 * **returned**: The delivery has been successfully returned to the pickup location.
 * **unable_to_deliver**: Catch­all reason if courier is unable to deliver.


## Full example

    var rush = require('uber-rush');

    rush.init({
        client_secret: YOUR_CLIENT_SECRET,
        client_id: YOUR_CLIENT_ID,
        sandbox: true
    }).then(function() {
        var delivery = new rush.Delivery({
            item: {
                title: 'Chocolate bar',
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
        });

        delivery.quote()
        .then(function(topQuote) {
            console.log('Got quotes', topQuote);

            delivery.on('status', function(status) {
                console.log('delivery status updated: ' + status);
            });
            delivery.on('location', function(loc) {
                console.log('delivery location updated: ', loc);
            });

            delivery.confirm();
        });
    }); 

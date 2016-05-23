# uber rush sdk

Node.js SDK for the UberRUSH API. Make deliveries without ever leaving your CLI.

## Prerequisites

You'll need a client ID and a client secret from Uber. Additionally, you'll want to test in the UberRUSH sandbox before you start using the API to move couriers around the world.

 1. Register at [https://developer.uber.com](http://developer.uber.com)
 2. Create a new app
 3. Enable the delivery sandbox
 4. some more steps
 5. `npm install @mjk/uber-rush`

When in sandbox mode, updated delivery statuses may either be simulated by you directly, by calling `delivery.updateStatus(<new-delivery-status>);`, or automatically by using the `simulate` truthy configuration parameter. If `simulate` is a number, it will be used as the interval in milliseconds between order status updates.

(If simulating yourself, you must call each delivery status in proper order.)

## Getting started 

#### Step 1: Intialize the SDK
Before making API calls, you must initialize the SDK with your app's ID and secret.

    const UberRUSH = require('uber-rush')
    const UberRUSHClient = new UberRUSH({
        client_secret: YOUR_CLIENT_SECRET,
        client_id: YOUR_CLIENT_ID,
        sandbox: true // No couriers will actually be called if set
    });

#### Step 2: Get a quote

Every delivery starts with a quote. Initialize a new delivery with

* a description of the item to be transported
* the pickup and the dropoff addresses
* (optionally) contact information at the pickup and drop off locations

configured in a plain old JavaScript object:

	  let delivery = UberRUSHClient.createDelivery({
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

The first quote in the array will be the best quote for the job. Confirming the delivery will start a courier on her journey (unless you're in the sandbox) so be sure you're ready! Before you confirm delivery, it's a good idea to subscribe to a few **events** in order to track the courier's progress.

Uber requests that we only check status every 30 seconds. If you're trying to keep up with your courier on a map, that's a slow update cycle--by default we only fire status update events on the same schedule. 

	delivery.on('status', function(status) {
		// fired every time the delivery status changes (see below)
		console.log('Delivery status: ' + status)
	});
	delivery.on('location', function(location) {
		/* location: {latitude: ..., longitude: ..., bearing: ...} */
		console.log('Courier location', location); 
	});
	delivery.confirm();



## API reference

### rush.Delivery
The core of the UberRUSH SDK, a Delivery is required to get a quote and dispatch a courier.

Initialize the Delivery with pickup and dropoff information (a Contact person in each location, and a Location).

	let Delivery = UberRUSHClient.createDelivery({
		pickup: {
			contact: Contact, /* see below */
			location: Location /* see below */
		},
		dropoff: {
			contact: Contact, /* see below */
			location: Location /* see below */
		},
		order_reference_id: /* (optional) your own order number for tracking */
	});
	
#### Methods

##### `delivery.quote()`

Requests a quote from the UberRUSH API. Returns a [promise](https://promisesaplus.com) for an array of `Quote` objects. 

Even if you're calling a courier with no regard for the price, actual delivery cannot begin until you have a quote. Thus, this is always the first step to calling a courier.

Example:

	delivery.quote()
	.then(function(quotes) {
		console.log('Received ' + quotes.length + ' quotes:');
		for (var i = 0; i < quotes.length; i++) console.log(quotes[i]);
	})
	.fail(function(error){
		console.log('Delivery quote error:',error);
	});

##### `delivery.confirm({...options...})`

Begins the delivery process (presuming you have a quote).

Valid options:

 * `quote_id`: (optional) ID of the quote you'd like to use to place this order (defaults to the first quote returned by `Delivery.quote`)
 * `order_reference_id`: (optional) internal order number to pass along to the courier (defaults to an empty string)
 
Emits a number of Events upon confirmation:
 * `dropoff_eta`
 * `pickup_eta`
 * `status`
 
Throws an error if the UberRUSH API won't confirm your delivery.

Example:

	delivery.quote().then(function () {
		try {
			delivery.confirm({order_reference_id: 'CB0023'});
		} catch (e) {
			console.error('Could not begin delivery',e)
		}
	});
	
##### `delivery.addItem(Item)`

Adds an Item to an order.

Example:

	delivery.addItem(new Item({
		title: 'Chocolate bar',
		quantity: 1,
		is_fragile: true
	}));

##### `delivery.setDropoff({contact: Contact /* optional */, location: Location /* optional */})`

Updates the dropoff with a new Contact and/or Location. Cannot be set if delivery is in progress.
Example:

	delivery.setDropoff({
		contact: Contact, // see below
		location: Location // see below
	});
		
##### `delivery.setPickup({contact: Contact /* optional */, location: Location /* optional */})`

Updates the pickup with a new Contact and/or Location. Cannot be set if delivery is in progress.

Example:

	delivery.setPickup({
		contact: Contact, // see below
		location: Location // see below
	});

##### `delivery.addSpecialInstructions(string)`

Adds a note, displayed on the courier's app, about special instructions for this delivery. Cannot be set if delivery is in progress.

Example:

	delivery.addSpecialInstructions("Always ring twice");

##### `delivery.requireSignature(bool)`

If true, or unset, requires signature on receipt. Cannot be set if delivery is in progress.

Example:

	delivery.requireSignature(); // signature is required
	delivery.requireSignature(false); // signature is not required
	delivery.requireSignature(true); // signature is required
	
### rush.Location
Represents the location a courier will be traveling to, as a regular street address. The API will determine its latitude and longitude for you.

Initialization parameters:

 * `address`:  The top address line (e.g., 64 Seabring St)
 * `address_2`: (optional) The second address line (suite number, C/O, etc)
 * `city`: The city (e.g., Brooklyn)
 * `state`: The state expressed as a two-letter code (e.g., NY)
 * `postal_code`: ZIP code
 * `country`: Two-letter country code (e.g., US)
 
Example: 

	var loc = new UberRUSH.Location({
		address: '64 Seabring St',
		city: 'Brooklyn',
		state: 'NY',
		postal_code: '11201',
		country: 'US'
	});
	
### rush.Item

What the courier will couriering.

Initialization parameters:

  * `title`: The name of the item.
  * `quantity`: The number of this item.
  * `width`: (optional) The width of the item in inches.
  * `height`: (optional) The height of the item in inches.
  * `length`: (optional) The length of the item in inches.
  * `price`: (optional) The price of the item. 
  * `currency_code`:(optional)  The currency code of the item price. The currency code follows the ISO 4217 standard.
  * `is_fragile`: (optional) Defaults to false.
 
Example: 

	var itm = new UberRUSH.Item({
		title: 'chocolate bar',
		quantity: 1,
		is_fragile: true
	});


## Events

Want to follow a delivery without polling? Use events!

### Delivery statuses
Delivery status is a string.

	delivery.on('status', function (status) {
		console.log('Delivery status: ' + status);
	});
	// Prints (e.g.): Delivery status: processing

Possible statuses:

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

### Delivery ETAs

Estimated Time of Arrival (ETA) is expressed as the number of minutes, from now, that something will happen. UberRUSH provides two ETAs: `dropoff_eta` (how long til the dropoff is likely to occur), and `pickup_eta` (how long til the courier will be picking up the item). These estimates will be updated automatially throughout the delivery process. Whenever that happens, these events will be fired.

Example:

	delivery.on('dropoff_eta', function(eta) {
		console.log('The dropoff time is now estimated to be in ' + eta + ' minutes');
	});

	delivery.on('pickup_eta', function(eta) {
		console.log('Your item will be picked up in approximately ' + eta + ' minutes');
	});	
	

### Delivery location
Once a courier is dispatched, you can track their current location via the location event. It emits a plain old object with latitude and longitude.

	delivery.on('location', function (location) {
		console.log('Delivery location: ' + location);
	});

Sample location:

		{
			latitude: 55.0, 
			longitude: -2.0, 
			bearing: 39, // courier's last bearing in radians
		}


## Full example

    const UberRUSH = require('uber-rush');

    const UberRUSHClient = new UberRUSH({
        client_secret: YOUR_CLIENT_SECRET,
        client_id: YOUR_CLIENT_ID,
        simulate: true
    });

    let delivery = UberRUSHClient.createDelivery({
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


### TODO

 * Offer courier path extrapolation snapped to Google Maps best bike route
 * Create mock server for offline integration

### Acknowledgements

LatLon library (c) Chris Veness 2002-2015

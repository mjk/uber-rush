var nconf = require('nconf');
var API = require('./lib/ApiRequest');

module.exports = {
    init: function(options) {
        if (!options.client_secret) throw new Error("client_secret must be provided");
        if (!options.client_id) throw new Error("client_id must be provided");

        var sandbox = options.sandbox || !options.production;
        var scope = (sandbox ? 'delivery_sandbox' : 'delivery');

        nconf.use('memory');

        nconf.set('uber_api_client_secret', options.client_secret);
        nconf.set('uber_api_client_id', options.client_id);
        nconf.set('uber_api_server_token', options.server_token);
        nconf.set('uber_api_sandbox', sandbox);
        nconf.set('uber_api_simulate', options.simulate);
        nconf.set('uber_api_debug', options.debug);
        nconf.set('uber_api_scope', scope);

        if (options.debug) {
            console.log(
              'Initializing uber in', (sandbox ? 'sandbox' : 'production'),
              'mode with scope:', scope
            );
        }

        return API.getToken();
    },
    Delivery: require('./lib/Delivery'),
    Location: require('./lib/Location'),
    Quote: require('./lib/Quote'),
    Item: require('./lib/Item'),
    Contact: require('./lib/Contact')
};

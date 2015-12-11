'use strict';

var _ = require('lodash');
var util = require('util');
var async = require('async');
var events = require('events');
var rest = require('restling');
var nconf = require('nconf');
var Q = require('q');

var API_SANDBOX_URI = 'https://sandbox-api.uber.com/v1/';
var API_PRODUCTION_URI = 'https://api.uber.com/v1/';
var OAUTH_URI = 'https://login.uber.com/oauth/v2/token';

var REFRESH_SECONDS_BEFORE_EXPIRY = 10;

var access_token;
var expires_at;

function setTimeout_ (fn, delay) {
    var maxDelay = Math.pow(2,31)-1;

    if (delay > maxDelay) {
        var args = arguments;
        args[1] -= maxDelay;

        return setTimeout(function () {
            setTimeout_.apply(undefined, args);
        }, maxDelay);
    }

    return setTimeout.apply(undefined, arguments);
}

function refresh(expiresIn) {
    var refreshTimeMs = (expiresIn - REFRESH_SECONDS_BEFORE_EXPIRY)*1000;
    setTimeout_(function() {
        console.log('Uber API token expires in '+REFRESH_SECONDS_BEFORE_EXPIRY+' seconds. Refreshing.')
        getToken();
    }, refreshTimeMs);
}

function getToken(options) {
    options = options || {};

    if (options.accessToken) {
        access_token = options.accessToken;
    }
    if (access_token) {
        if (expires_at > Date.now() + 20000) {
            return Q(access_token);
        }
    }

    console.log('Getting Uber API token.');
    var scope = nconf.get('uber-api-scope');

    return rest.post(OAUTH_URI, {
        multipart: true,
        data: {
            client_secret: nconf.get('uber_api_client_secret'),
            client_id: nconf.get('uber_api_client_id'),
            server_token: nconf.get('uber_api_server_token'),
            grant_type: 'client_credentials',
            scope: scope ? scope : 'delivery_sandbox'
        }
    }).then(function(result) {
        console.log('getToken result', result.data);
        if (result.response.statusCode == 200) {
            console.log('Authenticated and received Uber API access token.');
            access_token = result.data.access_token;
            var expiresInSeconds = parseInt(result.data.expires_in, 10);

            expires_at = Date.now() + expiresInSeconds * 1000;

            // kick off token refresh process
            refresh(expiresInSeconds);

            return access_token;
        } else {
            log.error('Uber API authentication failed', result.response.raw);
            throw new Error(result.response);
        }
    }, function(error) {
        console.error('Uber API authentication error', error.response.raw);
        throw new Error(error.response.raw);
    });
}

function getUrl(path) {
    var sandbox = nconf.get('uber_api_sandbox');
    return (sandbox ? API_SANDBOX_URI : API_PRODUCTION_URI) + (path||'');
}

function call(path, options) {

    return getToken(options)
    .then(function(accessToken) {
        if (!options.accessToken) options.accessToken = accessToken;
        console.log('API ' + options.method + ' ' +  getUrl(path), options.data);
        return rest.request(getUrl(path), options);
    }).then(function(result) {
        try {
            if (typeof result.data == 'string') result.data = JSON.parse(result.data);
        }
        catch (e) {
        }

        if (options.method == 'GET') {
            if (result.response.statusCode == 200) {
                return result.data;
            } 
        }
        if (options.method == 'POST') {
            if (result.response.statusCode == 204) {
                return true;
            }
        }
        return result;
    }, function(error) {
        console.error('RESULT', error.data);
        return error;
    });
}

module.exports = {
    'getToken': getToken,
    'post': function (path, data) {
        var options = {};
        options.method = 'POST';
        options.headers = {'content-type': 'application/json'};
        options.data = JSON.stringify(data);

        return call(path, options);
    },
    'put': function (path, data) {
        var options = {};
        options.method = 'PUT';
        options.headers = {'content-type': 'application/json'};
        options.data = JSON.stringify(data);
        return call(path, options);
    },
    'get': function (path) {
        var options = {
            method: 'GET'
        };
        return call(path, options);
    }
};

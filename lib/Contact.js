'use strict';

var _ = require('lodash');
var phone = require('phone');

/**
  A contact.

  @param contact.first_name string The first name of the contact.
  @param contact.last_name string The last name of the contact.
  @param contact.email string The email of the contact.

  @param contact.phone object The phone details of the contact.
  @param contact.phone.number string The phone number of the contact.
  @param contact.phone.sms_enabled boolean If the phone has SMS capabilities.
*/

function Contact(options) {
    var self = this;
    _.each(options, function(value, key) {
        if (key == 'phone') {
            value = {
                number: phone(value.number).length > 0 ? phone(value.number)[0] : null,
                sms_enabled: value.sms_enabled || false
            };
        }

        self[key] = value;
    });
}

module.exports = Contact;

'use strict';

const _ = require('lodash');
const phone = require('phone');

/**
  A contact.

  @param contact.first_name string The first name of the contact.
  @param contact.last_name string The last name of the contact.
  @param contact.email string The email of the contact.

  @param contact.phone object The phone details of the contact.
  @param contact.phone.number string The phone number of the contact.
  @param contact.phone.sms_enabled boolean If the phone has SMS capabilities.
*/

class Contact {
  constructor(options) {
    _.each(options, (value, key) => {
      if (key == 'phone') {
        value = {
          number: phone(value.number).length > 0 ? phone(value.number)[0] : null,
          sms_enabled: value.sms_enabled || false
        };
      }

      this[key] = value;
    });
  }
}

module.exports = Contact;

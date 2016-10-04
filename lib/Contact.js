'use strict';

const _ = require('lodash');
const phone = require('google-libphonenumber');
const PNF = phone.PhoneNumberFormat;
const phoneUtil = phone.PhoneNumberUtil.getInstance();

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
      if (key == 'phone' && value) {
        let parsedNumber;

        if (value.number) {
          try { 
            parsedNumber = phoneUtil.parse(value.number);
          } catch (e) {
            // Try adding +1 if number is 10+ chars but lacks country code,
            // as UberRush is only available in the US as of now.
            if (value.number.indexOf('+1') === -1 && value.number.replace(/ /g,'').length >= 10) {
              try { 
                parsedNumber = phoneUtil.parse('+1' + value.number);
              } catch (e) {
                console.error('Unable to parse phone number [' + value.number + ']', e);
              }
            } else {
              // TODO also be strict if we're in the sandbox env
              if (options.strict) throw e;
            }
          }
        }

        value = {
          number: parsedNumber ? phoneUtil.format(parsedNumber, PNF.E164) : value.number,
          sms_enabled: value.sms_enabled || false
        };
      }

      this[key] = value;
    });
  }
}

module.exports = Contact;

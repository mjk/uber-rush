'use strict';

/**
  An item to deliver.

  @param item.title string The title of the item.
  @param item.quantity integer The number of this item.
  @param item.width float The width of the item in inches. This field is optional.
  @param item.height float The height of the item in inches. This field is optional.
  @param item.length float The length of the item in inches. This field is optional.
  @param item.price float The price of the item. This field is optional.
  @param item.currency_code string The currency code of the item price. The currency code follows the ISO 4217 standard. This field is optional.
  @param item.is_fragile boolean If the item is fragile. This field is optional and will default to false.
*/

class Item {
  constructor(options) {
    this.title = options.title;
    this.quantity = options.quantity;
    this.width = options.width;
    this.height = options.height;
    this.length = options.length;
    this.price = options.price;
    this.currency_code = options.currency_code;
    this.is_fragile = options.is_fragile;
  }
}

module.exports = Item;

/*

Slab v0.5

----------------------

The MIT License (MIT)

Copyright © 2015 finebyte & Matthew Tole

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

--------------------

src/js/src/channel.js

*/


var _ = require('lodash');
var Utils = require('./utils');
var Message = require('./message');
var Users = require('./users');

function Channel(data) {
  this.data = data;
  this.id = data.id;
  this.messages = [];
}

Channel.prototype.update = function (data) {
  _.merge(this.data, data);
};

Channel.prototype.serialize = function () {
  var fields = [
    this.data.id,
    this.getDisplayName(),
    this.getUnreadCount()
  ];
  console.log('Channel Serialised: ' + fields.join(Utils.DELIM_DEBUG));
  return fields.join(Utils.DELIM);
};

Channel.prototype.addMessage = function (message) {
  if (!(message instanceof Message)) {
    message = new Message(message);
  }
  var currentMessage = _.find(this.messages, function (msg) {
    return msg.equals(message);
  });
  if (currentMessage) {
    console.log('Ignoring duplicated message!');
    // HACK: Need to do something smarter for updating messages.
    currentMessage.data.text = message.data.text;
    return;
  }
  this.messages.push(message);
  this.messages = _.sortBy(this.messages, function (msg) {
    return -1 * parseFloat(msg.data.ts, 10);
  });
  this.messages = _.take(this.messages, 100);
};

Channel.prototype.updateMessage = function (message) {
  var msg = _.findLast(this.messages, function (m) {
    return m.data.ts === message.message.ts;
  });
  if (msg) {
    msg.update(message.message);
  }
};

Channel.prototype.deleteMessage = function (message) {
  _.remove(this.messages, function (m) {
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    return m.data.ts === message.deleted_ts;
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
  });
};

Channel.prototype.getMessages = function () {
  return this.messages;
};

Channel.prototype.getType = function () {
  switch (this.data.id.substr(0, 1)) {
    case 'C':
      return 'channel';
    case 'G':
      return 'group';
    case 'D':
      return 'im';
    default:
      return 'unknown';
  }
};

Channel.prototype.isActive = function () {
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  switch (this.getType()) {
    case 'channel':
      return this.data.is_member;
    case 'group':
      return !this.data.is_archived;
    case 'im':
      return this.data.is_open;
  }
  return false;
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
};

Channel.prototype.getUnreadCount = function () {
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  if (this.getType() === 'im') {
    return this.data.unread_count;
  }
  return this.data.unread_count_display;
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
};

Channel.prototype.getDisplayName = function () {
  if (this.getType() === 'im') {
    var user = Users.findById(this.data.user);
    if (!user) {
      return this.data.user;
    }
    return user.name;
  }
  return this.data.name;
};

Channel.prototype.isStarred = function () {
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  return !!this.data.is_starred;
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
};

module.exports = Channel;

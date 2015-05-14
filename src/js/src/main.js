/*

Slab v1.0

----------------------

The MIT License (MIT)

Copyright © 2015 James Turck & Matthew Tole

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

src/js/src/main.js

*/

/* global superagent */
/* global MessageQueue */
/* global _ */

var accessToken = 'xoxp-4851112196-4852600748-4881601620-a7048f';
var channels = [];
var groups = [];
var ims = [];

Pebble.addEventListener('ready', function () {
  rtmStart();
});

Pebble.addEventListener('showConfiguration', function () {
  Pebble.openURL('https://slab-for-pebble.herokuapp.com/');
});

Pebble.addEventListener('webviewclosed', function (event) {
  accessToken = event.response;
  rtmStart();
});

function rtmStart() {
  if (!accessToken) {
    return;
  }
  superagent
    .post('https://slack.com/api/rtm.start?token=' + accessToken)
    .end(function (err, res) {
      if (err) {
        return console.log(err);
      }
      if (!res.body) {
        return console.log('Could not get a valid response from Slack');
      }
      channels = _.map(res.body.channels, Channel.create);
      groups = _.map(res.body.groups, Group.create);
      ims = _.map(res.body.ims, Im.create);
      sendInitialState();
      rtmConnect(res.body.url);
    });
}

function rtmConnect(url) {
  var rtmSocket = new WebSocket(url);
  rtmSocket.onmessage = function (event) {
    console.log(event.data);
  };
}

function sendInitialState() {
  MessageQueue.sendAppMessage({
    op: 'CHANNELS',
    data: Channel.serialize(channels)
  }, ack, nack);
  MessageQueue.sendAppMessage({
    op: 'GROUPS',
    data: Group.serialize(groups)
  }, ack, nack);
  MessageQueue.sendAppMessage({
    op: 'IMS',
    data: Im.serialize(ims)
  }, ack, nack);
}

function ack() {
  console.log('ACK!');
}

function nack() {
  console.log('NACK!');
}

function Channel(data) {
  this.data = data;
}

Channel.create = function (data) {
  return new Channel(data);
};

Channel.serialize = function (channels) {
  var filteredChannels = _.filter(channels, 'data.is_member');
  var serializedChannels = _.invoke(filteredChannels, 'serialize');
  serializedChannels.unshift(filteredChannels.length);
  return serializedChannels.join('^');
};

Channel.prototype.serialize = function () {
  return [
    this.data.id,
    this.data.name,
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    this.data.unread_count_display
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
  ].join('^');
};

function Group(data) {
  this.data = data;
}

Group.create = function (data) {
  return new Group(data);
};

Group.serialize = function (groups) {
  var filteredGroups = _.reject(groups, 'data.is_archived');
  var serializedGroups = _.invoke(filteredGroups, 'serialize');
  serializedGroups.unshift(filteredGroups.length);
  return serializedGroups.join('^');
};

Group.prototype.serialize = function () {
  return [
    this.data.id,
    this.data.name,
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    this.data.unread_count_display
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
  ].join('^');
};

function Im(data) {
  this.data = data;
}

Im.create = function (data) {
  return new Im(data);
};

Im.serialize = function (ims) {
  var filteredIms = _.filter(ims, 'data.is_open');
  var serializedIms = _.invoke(filteredIms, 'serialize');
  serializedIms.unshift(filteredIms.length);
  return serializedIms.join('^');
};

Im.prototype.serialize = function () {
  return [
    this.data.id,
    this.data.user, // TODO: Look this user up from the list of users.
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    this.data.unread_count
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
  ].join('^');
};

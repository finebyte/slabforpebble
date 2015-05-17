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

/* global Slack */
/* global async */
/* global sprintf */
/* global MessageQueue */
/* global AppInfo */
/* global _ */
/* global Channel */
/* global Group */
/* global Im */
/* global Users */
/* global Message */

var channels = [];
var groups = [];
var ims = [];
var DELIM = String.fromCharCode(AppInfo.settings.delimiter);

Pebble.addEventListener('ready', function () {
  rtmStart();
});

Pebble.addEventListener('showConfiguration', function () {
  Pebble.openURL('https://slab-for-pebble.herokuapp.com/');
});

Pebble.addEventListener('webviewclosed', function (event) {
  if (event.response === 'CANCELLED') {
    return;
  }
  Slack.setAccessToken(event.response);
  rtmStart();
});

Pebble.addEventListener('appmessage', function (event) {
  var op = event.payload.op;
  var data = event.payload.data;

  switch (op) {
    case 'MESSAGES':
      fetchMessages(data, function (err, messages) {
        if (err) {
          return console.log(err);
        }
        sendMessages(data, messages, function (err) {
          if (err) {
            return console.log(err);
          }
        });
      });
      break;
    default:
    // Pass!
  }
});

function rtmStart() {
  Slack.post('rtm.start', {}, function (err, data) {
    if (err) {
      return console.log(err);
    }
    channels = _.map(data.channels, Channel.create);
    groups = _.map(data.groups, Group.create);
    ims = _.map(data.ims, Im.create);
    Users.load(data.users);
    sendInitialState();
    if (window.WebSocket) {
      rtmConnect(data.url);
    }
  });
}

function rtmConnect(url) {
  var rtmSocket = new WebSocket(url);
  rtmSocket.onmessage = function (event) {
    var data = JSON.parse(event.data);
    switch (data.type) {
      case 'message':
        rtmMessage(data);
        break;
      case 'user_typing':
        // Fall through here.
      case 'presence_change':
        // Ignore these messages because they're boring.
        break;
      default:
      // console.log(JSON.stringify(data));
    }
  };
}

function rtmMessage() {
  // console.log(JSON.stringify(data, null, 2));
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

function fetchMessages(id, callback) {
  var apiMethod;

  switch (idType(id)) {
    case 'CHANNEL':
      apiMethod = 'channels.history';
      break;
    case 'GROUP':
      apiMethod = 'groups.history';
      break;
    case 'IM':
      apiMethod = 'im.history';
      break;
    default:
      return callback(new Error(sprintf('Unknown type for id %s', id)));
  }

  Slack.get(apiMethod, { channel: id }, function (err, data) {
    if (err) {
      return callback(err);
    }
    console.log(sprintf('Fetched %d messages for %s',
      data.messages.length, id));
    return callback(null, data.messages.map(Message.create));
  });
}

function sendMessages(id, messages, callback) {
  // TODO: Don't hardcode this value.
  var maxMessageLength = 1000;
  var messageData = '';
  var messageDataFull = false;
  var m = 0;
  var numMessages = 0;

  async.whilst(
    function () { return (m < messages.length - 1) && !messageDataFull; },
    function (callback) {
      var message = messages[m];
      m += 1;
      if (message.data.subtype) {
        console.log(
          sprintf('Skipping message with subtype %s', message.data.subtype));
        return callback();
      }
      console.log(JSON.stringify(message));
      message.serialize(function (err, str) {
        if ((messageData + str).length <= maxMessageLength) {
          messageData += DELIM + str;
          numMessages += 1;
        }
        else {
          messageDataFull = true;
        }
        return callback();
      });
    },
    function (err) {
      if (err) {
        // TODO: Send this error message somewhere!
        console.log(err);
        return;
      }
      var payload = {
        op: 'MESSAGES',
        data: id + DELIM + numMessages + DELIM + messageData
      };
      console.log(payload.data);
      MessageQueue.sendAppMessage(payload, function () {
        callback();
      }, function () {
        callback(new Error('NACK!'));
      });
    });
}

function ack() {
  console.log('ACK!');
}

function nack() {
  console.log('NACK!');
}

function idType(id) {
  switch (id[0]) {
    case 'G':
      return 'GROUP';
    case 'I':
      return 'IM';
    case 'C':
      return 'CHANNEL';
  }
}

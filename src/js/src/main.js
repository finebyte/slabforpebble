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
/* global moment */
/* global MessageQueue */
/* global AppInfo */
/* global _ */
/* global Channel */
/* global Group */
/* global Im */
/* global Users */

var accessToken = 'xoxp-4851112196-4852600748-4881601620-a7048f';
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
  accessToken = event.response;
  rtmStart();
});

Pebble.addEventListener('appmessage', function (event) {
  var op = event.payload.op;
  var data = event.payload.data;
  var dataArray = data.split(String.fromCharCode(AppInfo.settings.delimiter));

  switch (op) {
    case 'MESSAGES': {
      switch (dataArray[0]) {
        case 'CHANNEL':
          fetchChannelMessages(dataArray[1], function (err, messages) {
            if (err) {
              return console.log(err);
            }
            sendMessages(dataArray[1], messages, function (err) {
              if (err) {
                return console.log(err);
              }
            });
          });
          break;
      }
      break;
    }
    default:
    // Pass!
  }
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
      Users.load(res.body.users);
      sendInitialState();
      rtmConnect(res.body.url);
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

function fetchChannelMessages(id, callback) {
  superagent.get('https://slack.com/api/channels.history').query({
    token: accessToken,
    channel: id
  }).end(function (err, res) {
    if (err) {
      return callback(err);
    }
    if (!res.body.ok) {
      return callback(new Error('Failed to get channel messages'));
    }
    return callback(null, res.body.messages);
  });
}

function sendMessages(id, messages, callback) {
  var messagesResponse = [id, Math.min(10, messages.length)];
  messages.slice(0, 10).forEach(function (message) {
    var user = Users.findById(message.user);
    messagesResponse.push(user ? user.name : message.user);
    messagesResponse.push(
      moment(parseInt(message.ts, 10)).format('HH:mm'));
    messagesResponse.push(message.text);
  });
  var payload = { op: 'MESSAGES', data: messagesResponse.join(DELIM) };
  MessageQueue.sendAppMessage(payload, function () {
    callback();
  }, function () {
    callback(new Error('NACK!'));
  });
}

function ack() {
  console.log('ACK!');
}

function nack() {
  console.log('NACK!');
}

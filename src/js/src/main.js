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
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      channels = _.where(res.body.channels, { is_member: true });
      // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
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

function serialiseChannel(channel) {
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  return [channel.id, channel.name, channel.unread_count_display].join('^');
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
}

function sendInitialState() {
  MessageQueue.sendAppMessage({
    op: 'CHANNELS',
    data: _.map(channels, serialiseChannel).join('^')
  }, ack, nack);
}

function ack() {
  console.log('ACK!');
}

function nack() {
  console.log('NACK!');
}

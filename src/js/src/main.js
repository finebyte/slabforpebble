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

/* global AppInfo */
/* global async */
/* global DEBUG_ACCESS_TOKEN */
/* global MessageQueue */
/* global Slack */
/* global sprintf */
/* global State */
/* global store */
/* global Users */

var DELIM = String.fromCharCode(AppInfo.settings.delimiter);
var maxBufferSize = 1000;
var sendMessageTimer = null;

Pebble.addEventListener('ready', function () {
  if (typeof DEBUG_ACCESS_TOKEN !== 'undefined') {
    Slack.setAccessToken(DEBUG_ACCESS_TOKEN);
  }
  else {
    Slack.setAccessToken(store.get('slackAccessToken'));
  }
  rtmStart();
});

Pebble.addEventListener('showConfiguration', function () {
  var watch = Pebble.getActiveWatchInfo();
  var query = [];
  query.push(['version', AppInfo.versionLabel]);
  query.push(['hardware_platform', watch ? watch.platform : 'aplite']);
  if (watch) {
    query.push(['model', watch.model]);
    query.push(['language', watch.language]);
    if (watch.firmware.suffix && watch.firmware.suffix.length) {
      query.push(['firmware',
        sprintf('%d.%d.%d-%s', watch.firmware.major, watch.firmware.minor,
          watch.firmware.patch, watch.firmware.suffix)]);
    }
    else {
      query.push(['firmware',
        sprintf('%d.%d.%d', watch.firmware.major, watch.firmware.minor,
          watch.firmware.patch)]);
    }
  }
  query.push(['account_token', Pebble.getAccountToken()]);
  if (typeof DEBUG_ACCESS_TOKEN !== 'undefined') {
    query.push(['slack_access_token', DEBUG_ACCESS_TOKEN]);
  }
  else if (store.get('slackAccessToken')) {
    query.push(['slack_access_token', store.get('slackAccessToken')]);
  }
  var queryString = query.map(function (q) { return q.join('='); }).join('&');
  var configUrl = AppInfo.settings.configPage + '?' + queryString;
  console.log(configUrl);
  Pebble.openURL(configUrl);
});

Pebble.addEventListener('webviewclosed', function (event) {
  if (event.response === 'CANCELLED') {
    return;
  }
  try {
    var config = JSON.parse(event.response);
    Slack.setAccessToken(config.slackAccessToken);
    store.set('slackAccessToken', config.slackAccessToken);
    rtmStart();
  }
  catch (ex) {
  }
});

Pebble.addEventListener('appmessage', function (event) {
  var op = event.payload.op;
  var data = event.payload.data;
  var dataArray = data.split(String.fromCharCode(AppInfo.settings.delimiter));

  switch (op) {
    case 'MESSAGES':
      var channel = State.getChannel(data);
      State.setActiveChannel(channel.id);
      fetchMessages(data, function (err) {
        if (err) {
          return console.log(err);
        }
        sendMessages(data, channel.getMessages(), function (err) {
          if (err) {
            return console.log(err);
          }
        });
      });
      break;
    case 'MESSAGE':
      postMessage(dataArray[0], dataArray[1], function (err) {
        if (err) {
          return console.log(err);
        }
      });
      break;
    case 'BUFFER':
      maxBufferSize = parseInt(data, 10);
      console.log('Setting maximum buffer size: ' + maxBufferSize);
      break;
    default:
    // Pass!
  }
});

function rtmStart() {
  Slack.post('rtm.start', function (err, data) {
    if (err) {
      return console.log(err);
    }
    data.channels.forEach(function (channel) {
      State.addChannel(channel);
    });
    data.groups.forEach(function (channel) {
      State.addChannel(channel);
    });
    data.ims.forEach(function (channel) {
      State.addChannel(channel);
    });
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
      case 'presence_change':
        break;
      default:
        console.log(JSON.stringify(data));
    }
  };
}

function rtmMessage(data) {
  var channel = State.getChannel(data.channel);
  channel.addMessage(data);
  if (State.getActiveChannel() === channel.id) {
    if (sendMessageTimer) {
      clearTimeout(sendMessageTimer);
    }
    sendMessageTimer = setTimeout(function () {
      sendMessageTimer = null;
      sendMessages(data.channel, channel.getMessages(), function (err) {
        if (err) {
          console.log(err);
        }
      });
    }, 5000);
  }
}

function sendInitialState() {
  MessageQueue.sendAppMessage({
    op: 'CHANNELS',
    data: State.serializeChannels(State.getChannels('channel', true))
  }, ack, nack);
  MessageQueue.sendAppMessage({
    op: 'GROUPS',
    data: State.serializeChannels(State.getChannels('group', true))
  }, ack, nack);
  MessageQueue.sendAppMessage({
    op: 'IMS',
    data: State.serializeChannels(State.getChannels('im', true))
  }, ack, nack);
}

function fetchMessages(id, callback) {
  var apiMethod;
  var channel = State.getChannel(id);

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
    data.messages.forEach(function (message) {
      channel.addMessage(message);
    });
    return callback();
  });
}

function sendMessages(id, messages, callback) {
  var maxMessageLength = maxBufferSize - 64;
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
      message.serialize(function (err, str) {
        if (err) {
          console.log(err);
          return callback();
        }
        if (typeof str === 'undefined') {
          console.log('UNDEFINED!');
          console.log(JSON.stringify(message, null, 2));
          console.log('UNDEFINED!');
          return callback();
        }
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
      console.log(JSON.stringify(payload));
      console.log(payload.data.length);
      MessageQueue.sendAppMessage(payload, function () {
        callback();
      }, function () {
        callback(new Error('NACK!'));
      });
    });
}

function postMessage(id, message, callback) {
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  Slack.post('chat.postMessage', {
    channel: id,
    text: message,
    as_user: true
  }, callback);
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
}

function ack() {
  console.log('ACK!');
}

function nack(event) {
  console.log('NACK!');
  console.log(JSON.stringify(event));
}

function idType(id) {
  switch (id[0]) {
    case 'G':
      return 'GROUP';
    case 'D':
      return 'IM';
    case 'C':
      return 'CHANNEL';
  }
}

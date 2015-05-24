/*

Slab v0.1

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

src/js/src/main.js

*/


/* global AppInfo */
/* global async */
/* global DEBUG_ACCESS_TOKEN */
/* global MessageQueue */
/* global Slack */
/* global Errors */
/* global sprintf */
/* global State */
/* global store */
/* global Users */
/* global Utils */
/* exported DELIM_DEBUG */


var DELIM = String.fromCharCode(AppInfo.settings.delimiter);
var DELIM_DEBUG = '^';
var maxBufferSize = 1000;
var sendMessageTimer = null;
var quickRefreshChannel = null;


Pebble.addEventListener('ready', function () {
  console.log('Ready!');
  if (getSlackToken() && getSlackToken().length) {
    Slack.setAccessToken(getSlackToken());
    rtmStart();
  }
  else {
    MessageQueue.sendAppMessage({ op: 'CONFIG' }, ack, nack('ready:CONFIG'));
  }
});

Pebble.addEventListener('showConfiguration', function () {
  Pebble.openURL(buildConfigUrl());
});

Pebble.addEventListener('webviewclosed', function (event) {
  if (event.response === 'CANCELLED') {
    return;
  }
  try {
    var config = JSON.parse(event.response);
    var newToken = getSlackToken() !== config.accessToken;
    if (newToken) {
      Slack.setAccessToken(config.accessToken);
      store.set('slackAccessToken', config.accessToken);
      rtmStart();
    }
    store.set('replies', config.replies);
    sendReplies();
  }
  catch (ex) {
    Errors.send(ex, 'webviewclosed:catch');
    console.error(ex);
  }
});

Pebble.addEventListener('appmessage', function (event) {
  var op = event.payload.op;
  var data = event.payload.data;
  var dataArray = data.split(DELIM);

  switch (op) {
    case 'MESSAGES':
      var channel = State.getChannel(data);
      State.setActiveChannel(channel.id);
      fetchMessages(data, function (err) {
        if (err) {
          Errors.send(err, 'appmessage:MESSAGES:fetchMessages');
          return console.log(err);
        }
        sendMessages(data, channel.getMessages(), function (err) {
          if (err) {
            Errors.send(err, 'appmessage:MESSAGES:sendMessages');
            return console.log(err);
          }
        });
      });
      break;
    case 'MESSAGE':
      postMessage(dataArray[0], dataArray[1], function (err) {
        if (err) {
          MessageQueue.sendAppMessage({ op: 'ERROR', data: err.toString() });
          Errors.send(err, 'appmessage:MESSAGE:postMessage');
          return console.log(err);
        }
      });
      break;
    case 'BUFFER':
      maxBufferSize = parseInt(data, 10);
      console.log('Setting maximum buffer size: ' + maxBufferSize);
      break;
    case 'ERROR':
      Errors.send(new Error(data), 'watch:ERROR');
      break;
    default:
    // Pass!
  }
});


function rtmStart() {
  Slack.post('rtm.start', {}, function (err, data) {
    if (err) {
      Errors.send(err, 'rtmStart:rtm.start');
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
  var rtmSocket = new window.ReconnectingWebSocket(url);
  rtmSocket.onmessage = function (event) {
    var data = JSON.parse(event.data);
    switch (data.type) {
      case 'message':
        rtmMessage(data);
        break;
      case 'user_typing':
      case 'presence_change':
        break;
      case 'im_marked':
        break;
      case 'channel_marked':
        break;
      case 'group_marked':
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
    var delay = 5000;
    if (quickRefreshChannel === data.channel) {
      delay = 0;
      quickRefreshChannel = null;
    }
    sendMessageTimer = setTimeout(function () {
      sendMessageTimer = null;
      sendMessages(data.channel, channel.getMessages(), function (err) {
        if (err) {
          Errors.send(err, 'rtmMessage:sendMessages');
          console.log(err);
        }
      });
    }, delay);
  }
}

function sendInitialState() {
  MessageQueue.sendAppMessage({
    op: 'CHANNELS',
    data: State.serializeChannels(State.getChannels('channel', true))
  }, ack, nack('sendInitialState:CHANNELS'));
  MessageQueue.sendAppMessage({
    op: 'GROUPS',
    data: State.serializeChannels(State.getChannels('group', true))
  }, ack, nack('sendInitialState:GROUPS'));
  MessageQueue.sendAppMessage({
    op: 'IMS',
    data: State.serializeChannels(State.getChannels('im', true))
  }, ack, nack('sendInitialState:IMS'));
  sendReplies();
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
      var err = new Error(sprintf('Unknown type for id %s', id));
      Errors.send(err, 'fetchMessages:default');
      return callback(err);
  }

  Slack.get(apiMethod, { channel: id }, function (err, data) {
    if (err) {
      Errors.send(err, 'fetchMessages:Slack.get');
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
          Errors.send(err, 'sendMessages:message.serialize');
          console.log(err);
          return callback();
        }
        if (lengthInUtf8Bytes(messageData + str) <= maxMessageLength) {
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
        Errors.send(err, 'sendMessages:async.whilst');
        console.log(err);
        return;
      }
      var payload = {
        op: 'MESSAGES',
        data: id + DELIM + numMessages + DELIM + messageData
      };
      MessageQueue.sendAppMessage(payload, function () {
        callback();
      }, nack('sendMessages:MESSAGES'));
    });
}

function postMessage(id, message, callback) {
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  quickRefreshChannel = id;
  Slack.post('chat.postMessage', {
    channel: id,
    text: message,
    as_user: true
  }, callback);
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
}

function ack(event) {
  console.log('ACK! ' + event.data.transactionId);
}

function nack(context) {
  return function (event) {
    console.log('NACK!');
    Errors.send(event, context + ':NACK');
  };
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

function sendReplies() {
  var replies = store.get('replies', []);
  if (!replies.length) {
    return;
  }
  var data = replies.map(function (reply) { return reply.text; });
  data.unshift(replies.length);
  var message = {
    op: 'REPLIES',
    data: data.join(DELIM)
  };
  MessageQueue.sendAppMessage(message, ack, nack('sendReplies:REPLIES'));
}

function buildConfigUrl() {
  var watch = Pebble.getActiveWatchInfo();
  var query = [];
  query.push(['version', AppInfo.versionLabel]);
  query.push(['hardware_platform', watch ? watch.platform : 'aplite']);
  if (watch) {
    query.push(['model', watch.model]);
    query.push(['language', watch.language]);
    query.push(['firmware', Utils.serializeFirmware(watch.firmware)]);
  }
  query.push(['account_token', Pebble.getAccountToken()]);
  if (getSlackToken() && getSlackToken().length) {
    query.push(['slack_access_token', getSlackToken()]);
  }
  var queryString = query.map(function (q) { return q.join('='); }).join('&');
  return AppInfo.settings.configPage + '?' + queryString;
}

function getSlackToken() {
  if (typeof DEBUG_ACCESS_TOKEN !== 'undefined') {
    return DEBUG_ACCESS_TOKEN;
  }
  return store.get('slackAccessToken');
}

function lengthInUtf8Bytes(str) {
  var m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
}

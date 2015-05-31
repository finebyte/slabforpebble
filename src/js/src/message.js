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

src/js/src/message.js

*/

var moment = require('moment');
var sprintf = require('sprintf');
var async = require('async');
var Users = require('./users');
var Bots = require('./bots');
var EmojiMap = require('./emoji');
var Errors = require('./errors');
var Utils = require('./utils');

function Message(data) {
  this.data = data;
}

Message.prototype.serialize = function (callback) {
  var _this = this;
  var msg = [];
  async.series([
    function (next) {
      if (_this.data.subtype === 'bot_message') {
        _this.getBotName(function (err, name) {
          if (err) {
            Errors.send(err, 'Message.serialize:getUserName');
            name = 'BOT';
          }
          msg.push(name);
          next();
        });
      }
      else {
        _this.getUserName(function (err, name) {
          if (err) {
            Errors.send(err, 'Message.serialize:getUserName');
            name = _this.data.user;
          }
          msg.push(name);
          next();
        });
      }
    },
    function (next) {
      msg.push(_this.getTime());
      next();
    },
     function (next) {
       _this.getText(function (err, text) {
         if (err) {
           Errors.send(err, 'Message.serialize:getText');
           text = _this.data.text;
         }
         if (_this.data.attachments && _this.data.attachments.length) {
           if (!text.length && _this.data.attachments.length === 1 &&
             _this.data.attachments[0].fallback.length) {
             text = _this.data.attachments[0].fallback;
           }
           else {
             text += sprintf('<%d attachment%s>', _this.data.attachments.length,
               _this.data.attachments.length === 1 ? '' : 's');
           }
         }
         text = text.trim();
         if (!text.length) {
           text = 'NO MESSAGE';
         }
         msg.push(text);
         next();
       });
     }
  ],
  function (err) {
    if (err) {
      return callback(err);
    }
    return callback(null, msg.join(Utils.DELIM));
  });
};

Message.prototype.getUserName = function (callback) {
  var user = Users.findById(this.data.user);
  if (user) {
    return setTimeout(function () { callback(null, user.name); }, 0);
  }
  setTimeout(function () {
    callback(new Error('Have not implemented user lookup.'));
  }, 0);
};

Message.prototype.getBotName = function (callback) {
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  var bot = Bots.get(this.data.bot_id);
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
  if (bot) {
    return setTimeout(function () { callback(null, bot.name); }, 0);
  }
  setTimeout(function () {
    callback(new Error('Have not implemented user lookup.'));
  }, 0);
};

Message.prototype.getTime = function () {
  return moment.unix(parseInt(this.data.ts, 10)).format('HH:mm');
};

Message.prototype.getText = function (callback) {
  var text = this.data.text;

  var emojiMatches = text.match(/(\:[a-z\_]+\:)/g);
  if (emojiMatches) {
    emojiMatches.forEach(function (match) {
      text = processEmoji(text, match);
    });
  }

  var matches = text.match(/<([^>]+)>/g);
  if (!matches) {
    return callback(null, text);
  }
  async.eachSeries(matches, function (match, callback) {
    var matchType = match.substr(1, 2);
    switch (matchType) {
      case '@U':
        processUserMention(text, match, function (err, newText) {
          if (err) {
            return callback(err);
          }
          text = newText;
          return callback();
        });
        break;
      case '#C':
        processChannelReference(text, match, function (err, newText) {
          if (err) { return callback(err); }
          text = newText;
          return callback();
        });
        break;
      default:
        text = text.replace(match, match.substr(1, match.length - 2));
        return callback();
    }
  },
  function (err) {
    return callback(err, text);
  });
};

Message.prototype.equals = function (other) {
  return other.data.ts === this.data.ts;
};


function processUserMention(text, match, callback) {
  var userId = match.substr(2, match.length - 3);
  var user = Users.findById(userId);
  if (user) {
    return callback(null, text.replace(match, '@' + user.name));
  }
  Users.loadById(userId, function (err, user) {
    if (err) {
      Errors.send(err, 'processUserMention:Users.loadById');
      return callback(err);
    }
    if (user) {
      return callback(null, text.replace(match, '@' + user.name));
    }
    return callback(null, text);
  });
}

function processChannelReference(text, match, callback) {
  var channelId = match.substr(2, match.length - 3);
  console.log('Processing channel reference for: ' + channelId);
  return callback(null, text);
}

function findSurrogatePair(point) {
  // assumes point > 0xffff
  var offset = point - 0x10000;
  var lead = 0xd800 + (offset >> 10);
  var trail = 0xdc00 + (offset & 0x3ff);
  return String.fromCharCode(lead) + String.fromCharCode(trail);
}

function processEmoji(text, code) {
  var emoji = EmojiMap[code.substr(1, code.length - 2)];
  if (emoji) {
    if (emoji > 0xffff) {
      text = text.replace(code, findSurrogatePair(emoji));
    }
    else {
      text = text.replace(code, String.fromCharCode(emoji));
    }
  }
  return text;
}

module.exports = Message;

/* global moment */
/* global async */
/* global Users */
/* global EmojiMap */
/* global DELIM */

function Message(data) {
  this.data = data;
}

Message.create = function (data) {
  return new Message(data);
};

Message.prototype.serialize = function (callback) {
  var _this = this;
  this.getUserName(function (err, name) {
    if (err) {
      return callback(err);
    }
    _this.getText(function (err, text) {
      if (err) {
        return callback(err);
      }
      return callback(null, [
        name, _this.getTime(), text.length ? text : ' '
      ].join(DELIM));
    });
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
  console.log(matches);
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
    text = text.replace(code, findSurrogatePair(emoji));
  }
  return text;
}

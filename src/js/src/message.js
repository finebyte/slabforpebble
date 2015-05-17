/* global moment */
/* global async */
/* global Users */
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
  return moment(parseInt(this.data.ts, 10)).format('HH:mm');
};

Message.prototype.getText = function (callback) {
  var text = this.data.text;
  var matches = /(<.+>)/g.exec(text);
  if (!matches) {
    return callback(null, text);
  }
  async.each(matches, function (match, callback) {
    var matchType = match.substr(1, 2);
    switch (matchType) {
      case '@U':
        processUserMention(text, match, function (err, newText) {
          if (err) { return callback(err); }
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
        return callback(new Error('Unhandled matchType: ' + matchType));
    }
  },
  function (err) {
    return callback(err, text);
  });
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

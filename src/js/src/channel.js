/* global _ */
/* global DELIM */
/* global Message */
/* global Users */

function Channel(data) {
  this.data = data;
  this.id = data.id;
  this.messages = [];
}

Channel.create = function (data) {
  return new Channel(data);
};

Channel.prototype.serialize = function () {
  var fields = [
    this.data.id,
    this.getDisplayName(),
    this.getUnreadCount()
  ];
  console.log('Channel Serialised: ' + fields.join(' | '));
  return fields.join(DELIM);
};

Channel.prototype.addMessage = function (message) {
  if (!(message instanceof Message)) {
    message = new Message(message);
  }
  this.messages.push(message);
  this.messages = _.sortBy(this.messages, function (msg) {
    return -1 * parseFloat(msg.data.ts, 10);
  });
  this.messages = _.take(this.messages, 100);
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
    return Users.findById(this.data.user).name;
  }
  return this.data.name;
};

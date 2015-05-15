/* global _ */
/* global DELIM */

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
  return serializedChannels.join(DELIM);
};

Channel.prototype.serialize = function () {
  return [
    this.data.id,
    this.data.name,
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    this.data.unread_count_display
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
  ].join(DELIM);
};

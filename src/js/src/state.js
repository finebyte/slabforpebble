/* exported State */
/* global _ */
/* global Channel */
/* global DELIM */

var State = (function () {

  var channels = [];

  return {
    addChannel: addChannel,
    getChannel: getChannel,
    getChannels: getChannels,
    serializeChannels: serializeChannels
  };

  function addChannel(data) {
    var channel = getChannel(data.id);
    if (!channel) {
      channels.push(new Channel(data));
    }
  }

  function getChannel(id) {
    return _.findWhere(channels, { id: id });
  }

  function getChannels(type, activeOnly) {
    return _.filter(channels, function (channel) {
      if (activeOnly) {
        return channel.getType() === type && channel.isActive();
      }
      return channel.getType() === type;
    });
  }

  function serializeChannels(channels) {
    var serializedChannels = _.invoke(channels, 'serialize');
    serializedChannels.unshift(channels.length);
    return serializedChannels.join(DELIM);
  }

}());

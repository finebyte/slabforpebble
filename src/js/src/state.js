/* exported State */
/* global _ */
/* global Channel */
/* global DELIM */

var State = (function () {

  var channels = [];

  return {
    addChannel: addChannel,
    getChannels: getChannels,
    serializeChannels: serializeChannels
  };

  function addChannel(data) {
    var channel = _.findWhere(channels, { id: data.id });
    if (!channel) {
      channels.push(new Channel(data));
    }
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

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

src/js/src/state.js

*/


/* exported State */
/* global _ */
/* global Channel */
/* global DELIM */


var State = (function () {

  var channels = [];
  var activeChannel = null;

  return {
    addChannel: addChannel,
    getChannel: getChannel,
    getChannels: getChannels,
    getActiveChannel: getActiveChannel,
    setActiveChannel: setActiveChannel,
    serializeChannels: serializeChannels
  };

  function addChannel(data) {
    var channel = getChannel(data.id);
    if (channel) {
      channel.update(data);
    }
    else {
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

  function setActiveChannel(id) {
    activeChannel = id;
  }

  function getActiveChannel() {
    return activeChannel;
  }

  function serializeChannels(channels) {
    var serializedChannels = _.invoke(channels, 'serialize');
    serializedChannels.unshift(channels.length);
    return serializedChannels.join(DELIM);
  }

}());

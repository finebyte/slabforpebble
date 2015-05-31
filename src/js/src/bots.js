var  _ = require('lodash');

var bots = [];

module.exports.add = function (data) {
  var bot = module.exports.get(data.id);
  if (bot) {
    console.log('Duplicate bot!');
  }
  else {
    bots.push(data);
  }
};

module.exports.get = function (id) {
  return _.findWhere(bots, { id: id });
};

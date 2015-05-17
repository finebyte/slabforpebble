/* global _ */
/* global Slack */
/* exported Users */

var Users = (function () {

  var users = [];

  return {
    load: load,
    findById: findById,
    loadById: loadById
  };

  function load(rawUsers) {
    rawUsers.forEach(function (user) {
      if (findById(user.id)) {
        console.log('Duplicate user!');
      }
      else {
        users.push(user);
      }
    });
  }

  function findById(id) {
    return _.findWhere(users, { id: id });
  }

  function loadById(id, callback) {
    Slack.get('users.info', { user: id }, function (err, data) {
      if (err) {
        return callback(err);
      }
      users.push(data.user);
      return callback(null, data.user);
    });
  }

}());

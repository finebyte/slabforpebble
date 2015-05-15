/* global _ */
/* exported Users */

var Users = (function () {

  var users = [];

  return {
    load: load,
    findById: findById
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

}());

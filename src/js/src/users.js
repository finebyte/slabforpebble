/*

Slab v0.1

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

src/js/src/user.js

*/

/* global _ */
/* global Slack */
/* exported Users */

// TODO: Move this into the State class.
var Users = (function () {

  var users = [];

  return {
    load: load,
    findById: findById,
    loadById: loadById
  };

  function load(rawUsers) {
    rawUsers.forEach(function (user) {
      if (!findById(user.id)) {
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

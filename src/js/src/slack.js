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

src/js/src/slack.js

*/


/* exported Slack */
/* global superagent */

var Slack = (function () {

  var accessToken = null;
  var apiRoot = 'https://slack.com/api/';

  return {
    setAccessToken: setAccessToken,
    get: get,
    post: post
  };

  function setAccessToken(token) {
    accessToken = token;
  }

  function get(method, data, callback) {
    if (!accessToken) {
      return callback(new Error('No accessToken!'));
    }
    if (!callback && typeof data === 'function') {
      callback = data;
      data = {};
    }
    data.token = accessToken;
    superagent.get(apiRoot + method).query(data).end(doCallback(callback));
  }

  function post(method, data, callback) {
    if (!accessToken) {
      return callback(new Error('No accessToken!'));
    }
    if (!callback && typeof data === 'function') {
      callback = data;
      data = {};
    }
    data.token = accessToken;
    superagent.post(apiRoot + method).query(data).end(doCallback(callback));
  }

  function doCallback(callback) {
    return function (err, res) {
      if (err) {
        return callback(err);
      }
      if (!res.body) {
        return callback(
          new Error('Slack did not respond with well formed JSON'));
      }
      if (!res.body.ok) {
        return callback(new Error(res.body.error));
      }
      return callback(null, res.body);
    };
  }

}());

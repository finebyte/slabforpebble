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
    data.token = accessToken;
    superagent.get(apiRoot + method).query(data).end(doCallback(callback));
  }

  function post(method, data, callback) {
    if (!accessToken) {
      return callback(new Error('No accessToken!'));
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

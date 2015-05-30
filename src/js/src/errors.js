var superagent = require('superagent');
var Utils = require('./utils');
var AppInfo = require('./generated/appinfo');

module.exports.send = function (err, context) {
  try {
    var body = {
      err: err ? err.message || err.toString() : 'Unknown error',
      context: context,
      time: new Date(),
      version: AppInfo.versionLabel
    };
    var watch = Pebble.getActiveWatchInfo();
    body.hardwarePlatform = watch ? watch.platform : 'aplite';
    if (watch) {
      body.model = watch.model;
      body.language = watch.language;
      body.firmware = Utils.serializeFirmware(watch.firmware);
    }
    body.accountToken = Pebble.getAccountToken();
    superagent.post(AppInfo.settings.errorUrl).send(body).end(function () {
      // TODO: Maybe handle errors here?
    });
  }
  catch (ex) {
    // TODO: Maybe handle errors here?
  }
};

var AppInfo = require('./generated/appinfo');
var sprintf = require('sprintf');

module.exports.serializeFirmware = function (fw) {
  if (fw.suffix && fw.suffix.length) {
    return sprintf('%d.%d.%d-%s', fw.major, fw.minor, fw.patch, fw.suffix);
  }
  return sprintf('%d.%d.%d', fw.major, fw.minor, fw.patch);
};

module.exports.DELIM = String.fromCharCode(AppInfo.settings.delimiter);
module.exports.DELIM_DEBUG = '^';

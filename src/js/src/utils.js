/* global sprintf */
/* exported Utils */

var Utils = (function () {

  return {
    serializeFirmware: serializeFirmware
  };

  function serializeFirmware(fw) {
    if (fw.suffix && fw.suffix.length) {
      return sprintf('%d.%d.%d-%s', fw.major, fw.minor, fw.patch, fw.suffix);
    }
    return sprintf('%d.%d.%d', fw.major, fw.minor, fw.patch);
  }

}());

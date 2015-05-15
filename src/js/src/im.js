/* global _ */
/* global Users */
/* global DELIM */

function Im(data) {
  this.data = data;
}

Im.create = function (data) {
  return new Im(data);
};

Im.serialize = function (ims) {
  var filteredIms = _.filter(ims, 'data.is_open');
  var serializedIms = _.invoke(filteredIms, 'serialize');
  serializedIms.unshift(filteredIms.length);
  return serializedIms.join(DELIM);
};

Im.prototype.serialize = function () {
  return [
    this.data.id,
    Users.findById(this.data.user).name,
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    this.data.unread_count
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
  ].join(DELIM);
};

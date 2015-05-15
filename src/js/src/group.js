/* global _ */
/* global DELIM */

function Group(data) {
  this.data = data;
}

Group.create = function (data) {
  return new Group(data);
};

Group.serialize = function (groups) {
  var filteredGroups = _.reject(groups, 'data.is_archived');
  var serializedGroups = _.invoke(filteredGroups, 'serialize');
  serializedGroups.unshift(filteredGroups.length);
  return serializedGroups.join(DELIM);
};

Group.prototype.serialize = function () {
  return [
    this.data.id,
    this.data.name,
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    this.data.unread_count_display
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
  ].join(DELIM);
};

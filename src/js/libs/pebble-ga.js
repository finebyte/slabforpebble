var Analytics = function(analyticsId, appName, appVersion) {
  this.analyticsId = analyticsId;
  this.appName = appName;
  this.appVersion = appVersion;
  this.analyticsUserId = Pebble.getAccountToken();
  console.log(JSON.stringify(this));
};

Analytics.prototype._trackGA = function(type, params) {
  var req = new XMLHttpRequest();
  var url = 'http://www.google-analytics.com/collect';
  var trackingParams = 'v=1'
  + '&tid=' + this.analyticsId
  + '&cid=' + this.analyticsUserId
  + '&uid=' + this.analyticsUserId
  + '&t=' + type
  + '&an=' + this.appName
  + '&av=' + this.appVersion;

  for (parameterKey in params) {
    if (params.hasOwnProperty(parameterKey)) {
      trackingParams += '&'+ parameterKey +'='+ params[parameterKey];
    }
  }

  function reqListener () {
  }
  req.open('POST', url, true);
  req.onload = reqListener;
  req.setRequestHeader('Content-length', trackingParams.length);
  req.send(trackingParams);
}

Analytics.prototype.trackScreen = function (screenName) {
  this._trackGA('appview', {'cd': screenName});
}

Analytics.prototype.trackEvent = function (category, action) {
  this._trackGA('event', {'ec': category, 'ea': action});
}

module.exports = Analytics;

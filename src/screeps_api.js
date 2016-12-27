const ScreepsAPI = require('screeps-api');

ScreepsAPI.prototype.unsubscribe = function(path) {
  if (!path.match(/^([a-z]+):(.+?)$/))
    path = `user:${this.user._id}${path}`
  this.wssend(`unsubscribe ${path}`)
};

module.exports = ScreepsAPI;

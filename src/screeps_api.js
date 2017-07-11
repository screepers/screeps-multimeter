const ScreepsAPI = require('screeps-api');
const _ = require('lodash');

class ModifiedScreepsAPI extends ScreepsAPI {
  constructor(opts) {
    super(opts);
    this.on('newListener', (event, listener) => {
      if (event == 'open' && this.ws != null) {
        listener();
      }
    });
  }

  auth(email, password) {
    this.email = email;
    this.password = password;
    return this.reconnect();
  }

  unsubscribe(path) {
    if (!path.match(/^([a-z]+):(.+?)$/))
      path = `user:${this.user._id}${path}`
    this.wssend(`unsubscribe ${path}`)
  }

  reconnect() {
    if (this.ws) {
      this.ws.removeAllListeners();
    }
    this.ws = null;
    return new Promise((resolve, reject) => {
      this.getToken((err, data) => {
        if (err) return reject(err);
        if (data == 'unauthorized') return reject(new Error("Unauthorized"));
        return resolve(this);
      });
    }).then(() => this.socket()).then(() => {
      this.emit('open');
      return this;
    });
  }

  socket(cb) {
    return new Promise((resolve, reject) => {
      super.socket(() => {
        if (cb) cb();

        let schedule_ping = _.debounce(() => {
          if (this.ws) this.ws.ping(1);
        }, 10000);
        this.ws.on('message', schedule_ping);

        let listener = (msg) => {
          if (msg.slice(0, 7) == 'auth ok') {
            this.ws.removeListener('message', listener);
            resolve(this);
          }
        }
        this.ws.on('message', listener);

        this.ws.on('close', (code, reason) => {
          // This event fires twice for some reason
          let was_connected = !!this.ws;
          this.ws = null;
          if (was_connected) this.emit('close');
        });
      });
    });
  }
}

module.exports = ModifiedScreepsAPI;

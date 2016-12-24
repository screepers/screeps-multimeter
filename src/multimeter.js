const ScreepsAPI = require('screeps-api')
const blessed = require('blessed');
const MainView = require('../src/main_view');
const configManager = require('../src/config_manager');

const MOTD = "Now showing Screeps console. Type /help for help.";

module.exports = class Multimeter {
  constructor(config) {
    this.config = config;
  }

  run() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "Screeps",
    });

    this.view = new MainView({
      parent: this.screen,
      top: 0,
      left: 0,
      width: this.screen.width,
      height: this.screen.height,
    });

    this.view.on('exit', () => {
      this.screen.destroy();
      process.exit(0);
    });

    this.view.focus();

    this.connect()
      .then((api) => {
        this.view.log(MOTD);
        this.view.setAPI(api);
      });
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.view.log("Connecting to Screeps as " + this.config.email + "...");
      this.api = new ScreepsAPI();
      this.api.auth(this.config.email, this.config.password, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      })
    }).then(() => new Promise((resolve, reject) => {
      this.api.socket();

      this.api.on('message', (msg) => {
        if (msg.slice(0, 7) == 'auth ok') {
          resolve(this.api);
        }
      })
    }));
  }

};

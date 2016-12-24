const blessed = require('blessed');
const MainView = require('../src/main_view');
const configManager = require('../src/config_manager');

const MOTD = "Now showing Screeps console. Type /help for help.";

module.exports = class Multimeter {
  constructor(api) {
    this.api = api;
  }

  run() {
    return new Promise((resolve, reject) => {
      let screen = blessed.screen({
        smartCSR: true,
      });

      screen.title = "Screeps";

      let view = new MainView({
        parent: screen,
        top: 0,
        left: 0,
        width: screen.width,
        height: screen.height,
      });

      view.on('exit', () => {
        screen.destroy();
        process.exit(0);
      });

      view.setAPI(api);
      view.focus();
      view.log(MOTD);
    })
  }
};

const blessed = require('blessed');
const configManager = require('./config_manager');

const DIALOG_LABEL = ' {blue-fg}Multimeter Config{/blue-fg} ';

const CONFIG_DEFAULTS = {
  plugins: [],
};

function promiseFinally(promise, handler) {
  return promise.then(
		(res) => Promise.resolve(handler()).then(() => res),
		(err) => Promise.resolve(handler()).then(() => { throw err; })
	);
}

function message(screen, message) {
  var msg = blessed.message({
    parent: screen,
    border: 'line',
    height: 'shrink',
    width: 'half',
    top: 'center',
    left: 'center',
    label: DIALOG_LABEL,
    tags: true,
    keys: true,
    hidden: true,
    vi: true
  });

  return new Promise((resolve, reject) => {
    msg.display(message, 0, function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function prompt(screen, question, value) {
  var prompt = blessed.prompt({
    parent: screen,
    border: 'line',
    height: 'shrink',
    width: 'half',
    top: 'center',
    left: 'center',
    label: DIALOG_LABEL,
    tags: true,
    keys: true,
    vi: true
  });

  return new Promise((resolve, reject) => {
    prompt.input(question, value || "", function(err, value) {
      if (err) reject(err);
      else if (value) resolve(value);
      else reject(new Error("No answer"));
    });
  });
}

module.exports = function() {
  var screen = blessed.screen({
    smartCSR: true,
    ignoreLocked: ['C-c'],
    autoPadding: true,
  });
  var canceled = new Promise((resolve, reject) => {
    screen.key('C-c', () => setTimeout(reject, 100, new Error("Canceled")));
  });
  var promise = Promise.resolve(message(screen, 'No config file was found, so I will now create one. Press ^C to exit or any other key to continue.'))
    .then((config) => prompt(screen, "Enter your screeps API token:").then((token) => Object.assign({ token }, config)))
    .then((config) => prompt(screen, "Enter shard name:", "shard0").then((shard) => Object.assign({ shard }, config)))
    .then((config) => prompt(screen, "Enter a filename for configuration:", "screeps-multimeter.json").then((filename) => [ filename, config ]))
    .then(([filename, config]) => {
      config = Object.assign(config, CONFIG_DEFAULTS);
      configManager.config = config;
      return configManager.saveConfig(filename).then(() => [filename, config]);
    });

  return promiseFinally(Promise.race([promise, canceled]), () => {
    screen.destroy();
  });
};

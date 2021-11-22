const blessed = require("blessed");
const UnifiedConfig = require('./UnifiedConfig');
const homedir = require("homedir");
const fs = require('mz/fs');
const path = require("path");

const DIALOG_LABEL = " {blue-fg}Multimeter Config{/blue-fg} ";

const CONFIG_DEFAULTS = {
  plugins: [],
};

let screen = null;

function message(message) {
  var msg = blessed.message({
    parent: screen,
    border: "line",
    padding: 1,
    height: "shrink",
    width: "80%",
    top: "center",
    left: "center",
    label: DIALOG_LABEL,
    tags: true,
    keys: true,
    hidden: true,
    vi: true,
  });

  return new Promise((resolve, reject) => {
    msg.display(message, 0, function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function loadLegacyConfig() {
  let home = homedir();
  let paths = [
    "screeps-multimeter.json",
    path.resolve(home, ".config/screeps-multimeter/config.json"),
    path.resolve(home, ".config/screeps-multimeter.json"),
    path.resolve(home, ".screeps-multimeter.json"),
  ];
  try {
    let [filename, json] = await paths.reduce((seq, filename) => {
      return seq.catch(() => {
        return fs.readFile(filename, "utf-8").then(json => [filename, json]);
      });
    }, Promise.reject());

    let config = JSON.parse(json);

    // Migrate legacy schema
    config.server = Object.assign({
      host: config.hostname || 'screeps.com',
      secure: Boolean(config.token || config.protocol === 'https'),
      port: config.port,
      token: config.token,
      username: config.username,
      password: config.password,
    }, config.server || {});
    delete config.hostname;
    delete config.protocol;
    delete config.port;
    delete config.token;
    delete config.username;
    delete config.password;

    // Delete deprecated config
    delete config.watchShard;
    delete config.watchShards;
    delete config.shard;

    return [filename, config];
  } catch (err) {
    if (err.code === "ENOENT") {
      return [null, {}];
    }
    throw err;
  }
}

module.exports = async function(serverName) {
  let umc = new UnifiedConfig();
  let [legacyPath, legacyConfig] = await loadLegacyConfig();

  if (! legacyPath) {
    return;
  }

  try {
    screen = blessed.screen({
      smartCSR: true,
      ignoreLocked: ["C-c"],
      autoPadding: true,
    });

    screen.key("C-c", () => {
      process.exit(1);
    });

    let newConfig = await umc.getConfig();
    if (newConfig) {
      let newPath = umc.path;
      if (newConfig.configs && newConfig.configs.multimeter) {
        await message(`Found legacy config file ${legacyPath}.\nYou already have a unified config file (${newPath}) with a multimeter section.\nYou will need to resolve this conflict manually and delete the legacy config file.\n\nPress any key to exit.`);
        process.exit(0);
      } else {
        await message(`Found legacy config file ${legacyPath}.\nYou already have a unified config file (${newPath}).\nI will now copy the multimeter-specific settings into this file.\n\nPress Ctrl-C to exit or any other key to continue.`);
        await umc.saveConfig(newPath, legacyConfig);
        await message(`Successfully merged multimeter config. Please verify the server config and delete the legacy config file.\n\nPress any key to exit.`);
        process.exit(0);
      }
    } else {
      let newPath = '.screeps.yaml';
      await message(`Found legacy config file ${legacyPath}.\nI will now convert this to the new unified config file ${newPath}.\n\nPress Ctrl-C to exit or any other key to continue.`);
      await umc.createConfig(newPath, legacyConfig);
      fs.unlinkSync(legacyPath);
    }
  } finally {
    if (screen) {
      screen.destroy();
    }
  }
};

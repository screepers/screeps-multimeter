const fs = require("mz/fs");
const homedir = require("homedir");
const path = require("path");
const ConfigManager = require('./ConfigManager');

let manager = new ConfigManager();
let _config = null;

Object.defineProperty(exports, "filename", {
  get: () => {
    if (! _config) {
      throw new Error("Config not loaded yet");
    }
    return _config.filename;
  },
});

Object.defineProperty(exports, "config", {
  get: () => {
    if (! _config) {
      throw new Error("Config not loaded yet");
    }
    return _config.config;
  },
  set: value => {
    if (! _config) {
      _config = {};
    }
    _config.config = value;
  },
});

Object.defineProperty(exports, "legacy", {
  get: () => {
    if (! _config) {
      throw new Error("Config not loaded yet");
    }
    return _config.legacy;
  }
});

async function loadLegacyConfig() {
  let home = homedir();
  let paths = [
    path.resolve("./screeps-multimeter.json"),
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
    // Migration for legacy schema
    config.server = Object.assign({
      host: config.hostname,
      secure: Boolean(config.token || config.protocol == 'https'),
      port: config.port,
      token: config.token,
      username: config.username,
      password: config.password,
      defaultShard: config.shard,
      shards: config.watchShards,
    }, config.server || {});
    delete config.hostname;
    delete config.protocol;
    delete config.port;
    delete config.token;
    delete config.username;
    delete config.password;
    delete config.shard;
    delete config.watchShards;
    return [filename, config];
  } catch (err) {
    if (err.code == "ENOENT") {
      return [null, {}];
    }
    throw err;
  }
}

async function loadNewConfig() {
  let serverName = 'main';
  let conf = await manager.getConfig();
  if (! conf) {
    return [null, {}];
  }
  let mmConfig = conf.configs && conf.configs.multimeter || {};
  let config = Object.assign({}, mmConfig, {
    server: conf.servers && conf.servers[serverName] || {},
  });
  return [manager.path, config];
}

exports.loadConfig = async function() {
  let [filename, config] = await loadLegacyConfig();
  if (filename) {
    _config = {
      filename,
      config,
      legacy: true,
    };
    return [filename, config]
  }
  [filename, config] = await loadNewConfig();
  if (filename) {
    _config = {
      filename,
      config,
    };
  }
  return [filename, config]
};

exports.saveConfig = async function(filename) {
  let serverName = 'main';
  if (! _config) {
    throw new Error("Config not loaded yet");
  }
  filename = filename || _config.filename;
  if (! filename) {
    throw new Error("No filename given and no previous one available");
  }
  _config.filename = filename;
  if (! _config.legacy) {
    await manager.saveConfig(_config.filename, _config.config, serverName);
    return;
  }
  let data = JSON.stringify(_config.config, null, 2);
  return fs.writeFile(_config.filename, data, "utf-8");
};

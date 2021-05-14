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

Object.defineProperty(exports, "serverName", {
  get: () => {
    if (! _config) {
      throw new Error("Config not loaded yet");
    }
    return _config.serverName;
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
    }, config.server || {});
    delete config.hostname;
    delete config.protocol;
    delete config.port;
    delete config.token;
    delete config.username;
    delete config.password;
    return [filename, config];
  } catch (err) {
    if (err.code == "ENOENT") {
      return [null, {}];
    }
    throw err;
  }
}

async function loadNewConfig(serverName) {
  let conf = await manager.getConfig();
  if (! conf) {
    return [null, {}];
  }
  let serverConfig = conf.servers && conf.servers[serverName];
  if (! serverConfig) {
    throw new Error(`No config for server ${serverName}`);
  }
  let mmConfig = conf.configs && conf.configs.multimeter || {};
  let config = Object.assign({}, mmConfig, {
    server: serverConfig,
  });
  return [manager.path, config];
}

exports.loadConfig = async function(serverName) {
  // Use legacy config if found
  let [filename, config] = await loadLegacyConfig();
  if (filename) {
    if (serverName) {
      throw new Error('Legacy config does not support --server');
    }
    _config = {
      filename,
      config,
      legacy: true,
    };
    return [filename, config]
  }
  // Load unified config (.screeps.yaml)
  serverName = serverName || 'main';
  [filename, config] = await loadNewConfig(serverName);
  if (filename) {
    _config = {
      serverName,
      filename,
      config,
    };
  }
  return [filename, config]
};

exports.saveConfig = async function() {
  let serverName = 'main';
  if (! _config) {
    throw new Error("Config not loaded yet");
  }
  if (! _config.filename) {
    throw new Error("No filename given and no previous one available");
  }
  if (! _config.legacy) {
    await manager.saveConfig(_config.filename, _config.config, _config.serverName);
    return;
  }
  let data = JSON.stringify(_config.config, null, 2);
  return fs.writeFile(_config.filename, data, "utf-8");
};

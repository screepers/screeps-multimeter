const fs = require("mz/fs");
const homedir = require("homedir");
const path = require("path");
const ConfigManager = require('./ConfigManager').ConfigManager;

var globalConfigFilename = null;
var globalConfig = null;
var globalConfigLegacy = false;

Object.defineProperty(exports, "filename", {
  get: () => {
    if (globalConfigFilename) return globalConfigFilename;
    throw new Error("Config not loaded yet");
  },
});

Object.defineProperty(exports, "config", {
  get: () => {
    if (globalConfig) return globalConfig;
    throw new Error("Config not loaded yet");
  },
  set: value => {
    globalConfig = value;
  },
});

Object.defineProperty(exports, "legacy", {
  get: () => {
    return globalConfigLegacy;
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
  let manager = new ConfigManager();
  let conf = await manager.getConfig();
  let mmConfig = conf.configs && conf.configs.multimeter || {};
  let config = Object.assign({}, mmConfig, {
    server: conf.servers && conf.servers[serverName] || {},
  });
  return [manager.path, config];
}

exports.loadConfig = async function() {
  let [filename, config] = await loadLegacyConfig();
  if (filename) {
    globalConfigFilename = filename;
    globalConfig = config;
    globalConfigLegacy = true;
    return [filename, config]
  }
  [filename, config] = await loadNewConfig();
  if (filename) {
    globalConfigFilename = filename;
    globalConfig = config;
  }
  return [filename, config]
};

exports.saveConfig = async function(filename) {
  let serverName = 'main';
  filename = filename || globalConfigFilename;
  if (!filename) {
    throw new Error("No filename given and no previous one available");
  } else if (!globalConfig) {
    throw new Error("Config not loaded yet");
  }
  if (! globalConfigLegacy) {
    let manager = new ConfigManager();
    await manager.saveConfig(globalConfigFilename, globalConfig, serverName);
    return;
  }
  let data = JSON.stringify(globalConfig, null, 2);
  globalConfigFilename = filename;
  return fs.writeFile(filename, data, "utf-8");
};

const UnifiedConfig = require('./UnifiedConfig');

// Unified config manager
let umc = new UnifiedConfig();
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

exports.loadConfig = async function(serverName) {
  serverName = serverName || 'main';
  let conf = await umc.getConfig();
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
  let filename = umc.path;
  _config = {
    serverName,
    filename,
    config,
  };
  return [filename, config];
}

exports.saveConfig = async function () {
  if (! _config) {
    throw new Error("Config not loaded yet");
  }
  if (! _config.filename) {
    throw new Error("No filename given and no previous one available");
  }
  await umc.saveConfig(_config.filename, _config.config);
};

// Config manager for screeps unified credentials file (.screeps.yaml).
// Originally taken from screeps-api.
const fs = require('fs');
const path = require('path');
const util = require('util');
const YAML = require('yaml');

const readFileAsync = util.promisify(fs.readFile)
const writeFileAsync = util.promisify(fs.writeFile)

class ConfigManager {
  async refresh () {
    this._config = null
    return this.getConfig()
  }

  async getServers () {
    const conf = await this.getConfig()
    return Object.keys(conf.servers)
  }

  async getConfig () {
    if (this._config) {
      return this._config
    }
    const paths = []
    if (process.env.SCREEPS_CONFIG) {
      paths.push(process.env.SCREEPS_CONFIG)
    }
    const dirs = [__dirname, '']
    for (const dir of dirs) {
      paths.push(path.join(dir, '.screeps.yaml'))
      paths.push(path.join(dir, '.screeps.yml'))
    }
    if (process.platform === 'win32') {
      paths.push(path.join(process.env.APPDATA, 'screeps/config.yaml'))
      paths.push(path.join(process.env.APPDATA, 'screeps/config.yml'))
    } else {
      if (process.env.XDG_CONFIG_PATH) {
        paths.push(
          path.join(process.env.XDG_CONFIG_HOME, 'screeps/config.yaml')
        )
        paths.push(
          path.join(process.env.XDG_CONFIG_HOME, 'screeps/config.yml')
        )
      }
      if (process.env.HOME) {
        paths.push(path.join(process.env.HOME, '.config/screeps/config.yaml'))
        paths.push(path.join(process.env.HOME, '.config/screeps/config.yml'))
        paths.push(path.join(process.env.HOME, '.screeps.yaml'))
        paths.push(path.join(process.env.HOME, '.screeps.yml'))
      }
    }
    for (const path of paths) {
      const data = await this.loadConfig(path)
      if (data) {
        if (!data.servers) {
          throw new Error(
            `Invalid config: 'servers' object does not exist in '${path}'`
          )
        }
        this._config = data
        this.path = path
        return data
      }
    }
    return null
  }

  async loadConfig (file) {
    try {
      const contents = await readFileAsync(file, 'utf8')
      return YAML.parse(contents)
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false
      } else {
        throw e
      }
    }
  }

  /**
   * Save multimeter-specific settings to config file.
   * Uses YAML.parseDocument and merges in settings to avoid changing
   * formatting in the rest of the config file.
   */
  async saveConfig(file, config, serverName) {
    let content = await readFileAsync(file, 'utf8');
    let doc = YAML.parseDocument(content);
    let servers = doc.get('servers');
    if (! servers) {
      servers = doc.createNode({});
      doc.set('servers', servers);
    }
    let serverConfig = servers.get(serverName);
    if (! serverConfig) {
      serverConfig = doc.createNode({});
      servers.set(serverName, serverConfig);
    }
    serverConfig.set('defaultShard', config.server.defaultShard);
    serverConfig.set('shards', doc.createNode(config.server.shards || []));
    serverConfig.get('shards').type = 'FLOW_SEQ';
    let configs = doc.get('configs');
    if (! configs) {
      configs = doc.createNode({});
      doc.set('configs', configs);
    }
    let mmConfig = Object.assign({}, config);
    delete mmConfig.server;
    configs.set('multimeter', mmConfig);
    await writeFileAsync(file, doc.toString());
  }
}

module.exports = ConfigManager;

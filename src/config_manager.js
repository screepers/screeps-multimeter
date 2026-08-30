const fs = require('fs/promises');
const { ScreepsConfigManager } = require('screeps-api');
const YAML = require('yaml');

const APP_NAME = 'multimeter';
const scm = new ScreepsConfigManager();
let _config = null;

Object.defineProperty(exports, 'filename', {
    get: () => {
        if (!_config) {
            throw new Error('Config not loaded yet');
        }
        return _config.filename;
    },
});

Object.defineProperty(exports, 'config', {
    get: () => {
        if (!_config) {
            throw new Error('Config not loaded yet');
        }
        return _config.config;
    },
    set: (value) => {
        if (!_config) {
            _config = {};
        }
        _config.config = value;
    },
});

Object.defineProperty(exports, 'serverName', {
    get: () => {
        if (!_config) {
            throw new Error('Config not loaded yet');
        }
        return _config.serverName;
    },
});

exports.findConfigFile = async function () {
    if (process.env.SCREEPS_CONFIG) {
        const parsed = await scm.loadFile(process.env.SCREEPS_CONFIG);
        if (parsed) {
            return process.env.SCREEPS_CONFIG;
        }
    }
    for (const file of scm.defaultPaths) {
        const parsed = await scm.loadFile(file);
        if (parsed) {
            return file;
        }
    }
    return null;
};

async function saveMultimeterSection(file, config) {
    let content = await fs.readFile(file, 'utf8');
    let doc = YAML.parseDocument(content);
    let configs = doc.get('configs');
    if (!configs) {
        configs = doc.createNode({});
        doc.set('configs', configs);
    }
    let mmConfig = Object.assign({}, config);
    delete mmConfig.server;
    configs.set(APP_NAME, mmConfig);
    await fs.writeFile(file, doc.toString());
}

exports.loadConfig = async function (serverName) {
    serverName = serverName || 'main';
    const filename = await exports.findConfigFile();
    if (!filename) {
        return [null, {}];
    }

    let httpConfig;
    try {
        httpConfig = await scm.loadConfig(serverName, {
            app: APP_NAME,
            file: filename,
        });
    } catch (err) {
        if (err.message.includes('not found')) {
            throw new Error(`No config for server ${serverName}`);
        }
        throw err;
    }

    const parsed = httpConfig.parsed;
    const servers = 'servers' in parsed ? parsed.servers : parsed;
    const serverConfig = servers[serverName];
    const mmConfig = (parsed.configs && parsed.configs[APP_NAME]) || {};
    const config = Object.assign({}, mmConfig, { server: serverConfig });
    _config = { serverName, filename, config };
    return [filename, config];
};

exports.saveConfig = async function () {
    if (!_config) {
        throw new Error('Config not loaded yet');
    }
    if (!_config.filename) {
        throw new Error('No filename given and no previous one available');
    }
    await saveMultimeterSection(_config.filename, _config.config);
};

exports.mergeMultimeterConfig = async function (file, config) {
    await saveMultimeterSection(file, config);
};

exports.createConfig = async function (file, config) {
    let mmConfig = Object.assign({}, config);
    delete mmConfig.server;
    let root = {
        servers: { main: config.server },
        configs: { [APP_NAME]: mmConfig },
    };
    await fs.writeFile(file, YAML.stringify(root));
};

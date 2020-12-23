const fs = require("mz/fs");
const homedir = require("homedir");
const path = require("path");

var globalConfigFilename = null;
var globalConfig = null;

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

exports.loadConfig = async function() {
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
    globalConfigFilename = filename;
    globalConfig = config;
    return [filename, config];
  } catch (err) {
    if (err.code == "ENOENT") {
      return [null, {}];
    }
    throw err;
  }
};

exports.saveConfig = async function(filename) {
  filename = filename || globalConfigFilename;
  if (!filename) {
    throw new Error("No filename given and no previous one available");
  } else if (!globalConfig) {
    throw new Error("Config not loaded yet");
  }
  let data = JSON.stringify(globalConfig, null, 2);
  globalConfigFilename = filename;
  return fs.writeFile(filename, data, "utf-8");
};

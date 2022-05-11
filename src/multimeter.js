const { ScreepsAPI } = require("screeps-api");
const blessed = require("blessed");
const configManager = require("../src/config_manager");
const printf = require("printf");
const _ = require("lodash");
const Console = require("./console");
const EventEmitter = require("events");
const require_relative = require("require-relative");
const path = require("path");
const util = require("util");

const MOTD = "Now showing Screeps console. Type /help for help.";
const BUILTIN_PLUGINS = [
  "../plugins/alias",
  "../plugins/auto_update",
  "../plugins/watch",
  "../plugins/screeps_console.compat",
  "../plugins/html.js",
  "../plugins/pause",
  "../plugins/filter",
  "../plugins/log"
];

class Gauges extends blessed.layout {
  constructor(opts) {
    super(
      Object.assign(
        {
          style: { inverse: true },
          layout: "grid",
        },
        opts,
      ),
    );

    let cpu_box = blessed.box({
      parent: this,
      top: 0,
      height: 1,
      width: "50%",
      style: { inverse: true },
    });

    let mem_box = blessed.box({
      parent: this,
      top: 0,
      height: 1,
      width: "50%",
      style: { inverse: true },
    });

    this.cpuLabel = blessed.text({
      parent: cpu_box,
      top: 0,
      left: 0,
      height: 1,
      width: 12,
      content: "CPU:    /   ",
      style: { inverse: true },
    });

    this.cpuBar = blessed.progressbar({
      parent: cpu_box,
      top: 0,
      height: 1,
      left: this.cpuLabel.width + 1,
      pch: "|",
      bch: " ",
      style: { inverse: true, bar: { inverse: true } },
    });

    this.memLabel = blessed.text({
      parent: mem_box,
      top: 0,
      left: 0,
      height: 1,
      width: 16,
      content: "Mem:     K/    K",
      style: { inverse: true },
    });

    this.memBar = blessed.progressbar({
      parent: mem_box,
      top: 0,
      height: 1,
      left: this.memLabel.width + 1,
      pch: "|",
      bch: " ",
      style: { inverse: true, bar: { inverse: true } },
    });
  }

  update(cpu_current, cpu_limit, mem_current, mem_limit) {
    if (Number.isNaN(parseInt(cpu_current, 10))) {
      this.cpuLabel.setContent("CPU: ERROR");
      this.cpuBar.setProgress(100);
    } else {
      this.cpuLabel.setContent(printf("CPU: %3d/%3d", cpu_current, cpu_limit));
      this.cpuBar.setProgress(cpu_current / cpu_limit * 100);
    }
    this.memLabel.setContent(
      printf("Mem: %4dK/%4dK", mem_current / 1024, mem_limit / 1024),
    );
    this.memBar.setProgress(mem_current / mem_limit * 100);
    this.screen.render();
  }
}

module.exports = class Multimeter extends EventEmitter {
  constructor(configManager) {
    super();
    this.configManager = configManager;
    this.config = configManager.config;
    this.commands = {};
    this.cpuLimit = 1;
    this.memoryLimit = 2097152;
    this.statusHandlers = [];
    this.shard = '';
    this.shards = [];

    this.addCommand("help", {
      description: 'List the available commands. Try "/help help".',
      helpText:
        "Usage: /help COMMAND\tFind out the usage for COMMAND.\nUsage: /help        \tList all available commands.",
      handler: this.commandHelp.bind(this),
    });
    this.addCommand("clear", {
      description: "Clear the console output.",
      handler: this.commandClear.bind(this),
    });
    this.addCommand("reconnect", {
      description: "Force a reconnection.",
      handler: this.commandReconnect.bind(this),
    });
    this.addCommand("server", {
      description: "Change server",
      helpText:
        "/server SERVER Reconnect to the specified server.\n" +
        "/server        Show the current server name.\n",
      handler: this.commandServer.bind(this),
    });
    this.addCommand("shard", {
      description: "Set or show the destination shard for commands",
      helpText:
        "/shard SHARD  Set the destination shard for commands.\n" +
        "/shard        Show the current selected shard.\n" +
        "\n" +
        'If SHARD is a number, it will be prefixed with "shard", so "/shard 2" will set the shard to shard2.',
      handler: this.commandShard.bind(this),
    });

    this.addCommand("quit", {
      description: "Exit the program.",
      handler: this.commandQuit.bind(this),
    });
  }

  run() {
    this.screen = blessed.screen({
      fullUnicode: true,
      smartCSR: true,
      title: "Screeps",
    });

    this.screen.program.key("C-c", () => {
      this.emit('exit');
    });

    this.screen.program.key("C-l", () => {
      this.screen.alloc();
      this.screen.render();
    });

    // Enable bracketed paste mode
    this.screen.program.setMode('?2004h');

    this.on('exit', () => {
      // Disable bracketed paste mode
      this.screen.program.setMode('?2004l');
    });

    this.gauges = new Gauges({
      parent: this.screen,
      top: 0,
      left: 0,
      height: 1,
    });

    this.console = new Console({
      parent: this.screen,
      top: 1,
      left: 0,
      right: 0,
      bottom: 0,
      historyFile: ".screeps-multimeter.history",
      shard: this.shard,
    });

    this.console.focus();
    this.console.on("line", this.handleConsoleLine.bind(this));

    this.onDisconnect = () => {
        this.log("Disconnected. Reconnecting...");
    };

    this.loadPlugins();

    this.connect().then(api => {
      this.console.log(MOTD);
    });
  }

  async connect(serverName) {
    serverName = serverName || this.configManager.serverName;
    if (serverName !== this.configManager.serverName) {
      await this.configManager.loadConfig(serverName);
      if (this.api) {
        this.disconnect();
      }
    }
    this.config = this.configManager.config;

    // TODO: Use ScreepsAPI.fromConfig instead?
    var opts = {};
    opts.token = this.config.server.token || process.env.SCREEPS_TOKEN;
    opts.protocol = this.config.server.secure ? 'https' : 'http';
    if (this.config.server.host) opts.hostname = this.config.server.host;
    if (this.config.server.port) opts.port = this.config.server.port;
    if (this.config.server.path) opts.path = this.config.server.path;

    this.api = new ScreepsAPI(opts);

    this.console.log(`Connecting to ${serverName} (${this.api.opts.url}) ...`);

    // We need to get a new token from the server if we don't already have one.
    if (!opts.token) {
      await this.api.auth(this.config.server.username, this.config.server.password);
    }

    // Automatically detect available shards
    let userInfo = await this.api.me();
    if (userInfo.cpuShard) {
      this.console.log('Found shards: ' + JSON.stringify(userInfo.cpuShard));
      let shards = Object.keys(userInfo.cpuShard);
      if (shards.length) {
        // Default to the shard with the most CPU
        this.shard = _.maxBy(shards, shard => userInfo.cpuShard[shard]);
      }
      // Filter to only shards with CPU allocated
      this.shards = _.filter(shards, shard => userInfo.cpuShard[shard] > 0);
      this.console.setShard(this.shard);
    } else {
      // Private server (no shard names)
      // NOTE: Uses a different memory path with the shard name omitted entirely
      this.shard = '';
      this.shards = [''];
      // Show server name instead
      this.console.setShard(`[${serverName}]`);
    }

    this.api.socket.subscribe("console", event => {
      const { data } = event;
      if (data.messages) {
        data.messages.log.forEach(l => this.console.addLines("log", l, data.shard));
        data.messages.results.forEach(l =>
          this.console.addLines("result", l, data.shard),
        );
      }
      if (data.error) this.console.addLines("error", data.error);
    });

    this.api.socket.subscribe("cpu", event => {
      var { data } = event;
      this.gauges.update(
        data.cpu,
        this.cpuLimit,
        data.memory,
        this.memoryLimit,
      );
    });

    this.api.socket.subscribe("code", msg => {
      this.log("Code updated");
    });

    this.api.socket.on("disconnected", this.onDisconnect);

    this.api.socket.connect().then(() => {
      // Emit connected event for plugins to use
      this.emit('connected', this.api);

      this.api.me().then(data => {
        this.cpuLimit = data.cpu;
        this.memLimit = 2097152;
      });
    });
  }

  disconnect() {
    this.api.socket.removeListener("disconnected", this.onDisconnect);
    this.api.socket.disconnect();
    this.api = null;
  }

  loadPlugins() {
    _.each(BUILTIN_PLUGINS, name => {
      const module = require(name);
      module(this);
    });
    _.each(this.config.plugins, name => {
      const module = require_relative(name, this.configManager.filename);
      module(this);
    });
  }

  /// Interpret command as if the user had typed it in the console.
  handleConsoleLine(command) {
    if (command[0] === "/") {
      command = command.trim();
      if (command.match(/^\/shard[0-9]+$/)) {
        command = '/shard ' + command.slice(6);
      }
      let args = command.slice(1).split(" ");
      let cmd = this.commands[args[0].toLowerCase()];
      if (cmd) {
        cmd.handler.call(null, args.slice(1));
      } else {
        this.console.log("Invalid command: " + args[0]);
      }
    } else if (command.length > 0) {
      this.console.addLines("console", command, this.shard);
      if (this.api) this.api.console(command, this.shard);
    }
    this.screen.render();
  }

  handleComplete(line) {
    if (line[0] === "/") {
      let prefix = line.slice(1).toLowerCase();
      let options = _.filter(
        Object.keys(this.commands),
        k => prefix === k.slice(0, prefix.length),
      );
      return [options.map(l => "/" + l), line];
    } else {
      return [[], line];
    }
  }

  // Register a function to add a status indicator to the right of the input bar.
  // Only one status indicator can be shown at a time, so the first one to return a status wins.
  // Make sure important plugins are defined first (e.g. pause should come before filter).
  // You should call updateStatus() whenever your plugin status changes.
  addStatus(fn) {
    this.statusHandlers.push(fn);
  }

  updateStatus(fn) {
    for (let handler of this.statusHandlers) {
      let status = handler();
      if (status) {
        this.console.setStatus(status);
        return;
      }
    }
    this.console.setStatus(null);
  }

  /// Register a slash-command. Config object looks like:
  /// {
  ///   description: "1 line description of command",
  ///   helpText: "Full documentation for command",
  ///   handler: function(args) { /* do the command */ },
  /// }
  addCommand(command, config) {
    this.commands[command.toLowerCase()] = config;
  }

  removeCommand(command) {
    delete this.commands[command.toLowerCase()];
  }

  commandHelp(args) {
    if (args.length > 0) {
      let name = args[0].replace(/^\//, "").toLowerCase();
      var command = this.commands[name];
      if (command) {
        if (command.helpText) {
          this.log("Help for /" + name + ":\n" + command.helpText);
        } else {
          this.log("/" + name + "\t" + command.description);
        }
      } else {
        this.log("No help available for /" + name + ": not a valid command");
      }
    } else {
      let list = _.sortBy(
        _.map(this.commands, (c, k) => Object.assign({ name: k }, c)),
        c => c.name,
      );
      let longest = _.max(_.map(list, c => c.name.length));
      this.log(
        "Available commands:\n" +
          _.map(
            list,
            cmd => "/" + _.padEnd(cmd.name, longest) + "  " + cmd.description,
          ).join("\n"),
      );
    }
  }

  commandClear() {
    this.console.clear();
  }

  commandReconnect() {
    if (this.api.socket.ws) this.api.socket.ws.close();
  }

  async commandServer(args) {
    if (args.length > 0) {
      let server = args[0];
      try {
        await this.connect(server);
      } catch (err) {
        this.log('Error: ' + err.message);
      }
    } else {
      this.log("Current server: " + configManager.serverName);
    }
  }

  commandShard(args) {
    if (args.length > 0) {
      let shard = args[0];
      if (shard.match(/^[0-9]+$/)) {
        shard = 'shard' + shard;
      }
      this.shard = shard;
      this.console.setShard(this.shard);
    }
    this.log("Command Shard: " + this.shard);
  }

  commandQuit() {
    this.emit("exit");
  }

  log() {
    const message = util.format.apply(null, arguments);
    this.console.addLines("system", message);
  }
};

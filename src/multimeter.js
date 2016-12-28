const ScreepsAPI = require('./screeps_api')
const blessed = require('blessed');
const configManager = require('../src/config_manager');
const printf = require('printf');
const _ = require('lodash');
const Console = require('./console');
const EventEmitter = require('events');
const require_relative = require('require-relative');
const path = require('path');
const util = require('util');

const MOTD = "Now showing Screeps console. Type /help for help.";
const BUILTIN_PLUGINS = [
    "screeps-multimeter/plugins/alias",
    "screeps-multimeter/plugins/auto_update",
    "screeps-multimeter/plugins/watch"
];

class Gauges extends blessed.layout {
  constructor(opts) {
    super(Object.assign({
      style: { inverse: true },
      layout: 'grid',
    }, opts));

    let cpu_box = blessed.box({
      parent: this,
      top: 0,
      height: 1,
      width: '50%',
      style: { inverse: true },
    });

    let mem_box = blessed.box({
      parent: this,
      top: 0,
      height: 1,
      width: '50%',
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
      pch: '|',
      bch: ' ',
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
      pch: '|',
      bch: ' ',
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
    this.memLabel.setContent(printf("Mem: %4dK/%4dK", mem_current / 1024, mem_limit / 1024));
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

    this.addCommand("quit", {
      description: "Exit the program.",
      handler: this.commandQuit.bind(this)
    });
    this.addCommand("help", {
      description: "List the available commands. Try \"/help help\".",
      helpText: "Usage: /help COMMAND\tFind out the usage for COMMAND.\nUsage: /help        \tList all available commands.",
      handler: this.commandHelp.bind(this)
    });
  }

  run() {
    this.api = new ScreepsAPI();

    this.screen = blessed.screen({
      smartCSR: true,
      title: "Screeps",
    });

    this.screen.program.key('C-c', () => {
      process.exit(0);
    });

    this.screen.program.key('C-l', () => {
      this.screen.alloc();
      this.screen.render();
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
      historyFile: '.screeps-multimeter.history',
    });

    this.console.focus();
    this.console.on('line', this.handleConsoleLine.bind(this));

    this.loadPlugins();

    this.connect()
      .then((api) => {
        this.console.log(MOTD);
      });
  }

  connect() {
    this.console.log("Connecting to Screeps as " + this.config.email + "...");
    this.api.on('open', () => {
      this.api.subscribe('/console');
      this.api.subscribe('/cpu');
      this.api.subscribe('/code');
    });

    this.api.on('console', (msg) => {
      let [user, data] = msg;
      if (data.messages) {
        data.messages.log.forEach(l => {
          this.console.addLines('log', l)
        });
        data.messages.results.forEach(l => this.console.addLines('result', l));
      }
      if (data.error) this.console.addLines('error', data.error);
    });
    this.api.on('message', (msg) => {
      if (msg[0].slice(-4) == "/cpu") {
        let cpu = msg[1].cpu, memory = msg[1].memory;
        this.gauges.update(cpu, this.cpuLimit, memory, this.memoryLimit);
      }
    });
    this.api.on('code', (msg) => {
      this.log('Code updated');
    });

    this.api.on('close', () => {
      this.log("Disconnected. Reconnecting...");
      this.api.reconnect();
    });

    return this.api.auth(this.config.email, this.config.password)
      .then(() => {
        this.api.me((err, data) => {
          this.cpuLimit = data.cpu;
          this.memLimit = 2097152;
        });
      });
  }

  loadPlugins() {
    let plugins = _.uniq(BUILTIN_PLUGINS.concat(this.config.plugins))
    _.each(plugins, (name) => {
      let module = require_relative(name, this.configManager.filename);
      module(this);
    });
  }

  /// Interpret command as if the user had typed it in the console.
  handleConsoleLine(command) {
    if (command[0] == '/') {
      let args = command.slice(1).split(' ');
      let cmd = this.commands[args[0].toLowerCase()];
      if (cmd) {
        cmd.handler.call(null, args.slice(1));
      } else {
        this.console.log("Invalid command: " + args[0]);
      }
    } else if (command.length > 0) {
      this.console.addLines('console', command);
      if (this.api) this.api.console(command);
    }
    this.screen.render();
  }

  handleComplete(line) {
    if (line[0] == '/') {
      let prefix = line.slice(1).toLowerCase();
      let options = _.filter(Object.keys(this.commands), (k) => prefix == k.slice(0, prefix.length));
      return [ options.map((l) => "/" + l), line ];
    } else {
      return [[], line];
    }
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

  commandQuit() {
    this.emit('exit');
  }

  commandHelp(args) {
    if (args.length > 0) {
      let name = args[0].replace(/^\//, '').toLowerCase();;
      var command = this.commands[name];
      if (command) {
        if (command.helpText) {
          this.log('Help for /' + name + ':\n' + command.helpText);
        } else {
          this.log('/' + name + '\t' + command.description);
        }
      } else {
        this.log('No help available for /' + name + ': not a valid command');
      }
    } else {
      let list = _.sortBy(_.map(this.commands, (c, k) => Object.assign({ name: k }, c)), (c) => c.name);
      let longest = _.max(_.map(list, (c) => c.name.length));
      this.log('Available commands:\n' + _.map(list, (cmd) => '/' + _.padRight(cmd.name, longest) + '  ' + cmd.description).join('\n'));
    }
  }

  log() {
    var message = util.format.apply(null, arguments);
    this.console.addLines('system', message);
  }
};

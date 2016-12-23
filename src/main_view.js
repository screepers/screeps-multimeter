const blessed = require('blessed');
const text_prompt = require('./text_prompt');
const printf = require('printf');
const _ = require('lodash');

module.exports = class MainView extends blessed.element {
  constructor(opts) {
    super(opts);
    if (opts.api) {
      this.setAPI(opts.api);
    }

    this.commands = {};
    this.addCommand("quit", "Exit the program. Same as pressing ESC.", this.commandQuit.bind(this));
    this.addCommand("help", "List the available commands.", this.commandHelp.bind(this));

    this.logView = blessed.log({
      parent: this,
      top: 1,
      left: 0,
      width: this.width,
      height: this.height - 2,
      scrollback: 5000,
      tags: true,
    });

    this.prompt = new text_prompt({
      parent: this,
      top: this.height - 1,
      left: 0,
      width: this.width,
      height: 1,
      inputOnFocus: true,
      completer: this.handleComplete.bind(this),
      prompt: "<<< ",
      style: { inverse: true },
    });

    this.topBar = blessed.box({
      parent: this,
      top: 0,
      left: 0,
      width: this.width,
      height: 1,
      style: { inverse: true },
    });

    this.cpuLabel = blessed.text({
      parent: this.topBar,
      top: 0,
      left: 0,
      height: 1,
      width: 12,
      content: "CPU:    /   ",
      style: { inverse: true },
    });

    this.cpuBar = blessed.progressbar({
      parent: this.topBar,
      top: 0,
      height: 1,
      left: this.cpuLabel.width + 1,
      right: this.width / 2 - 1,
      pch: '|',
      bch: ' ',
      style: { inverse: true, bar: { inverse: true } },
    });

    this.memLabel = blessed.text({
      parent: this.topBar,
      top: 0,
      left: this.width / 2,
      height: 1,
      width: 16,
      content: "Mem:     K/    K",
      style: { inverse: true },
    });

    this.memBar = blessed.progressbar({
      parent: this.topBar,
      top: 0,
      height: 1,
      left: this.memLabel.left + this.memLabel.width + 1,
      right: this.width - 1,
      pch: '|',
      bch: ' ',
      style: { inverse: true, bar: { inverse: true } },
    });

    this.cpuLimit = 1;
    this.memoryLimit = 2097152;

    this.prompt.key('escape', (ch, key) => {
      this.emit('exit');
    });

    this.prompt.key('pageup', (ch, key) => {
      this.logView.scroll(-this.logView.height + 1);
      screen.render();
    });

    this.prompt.key('pagedown', (ch, key) => {
      this.logView.scroll(this.logView.height - 1);
      screen.render();
    });

    this.prompt.key('C-c', (ch, key) => {
      this.prompt.clearLine();
      screen.render();
    });

    this.prompt.on('line', (command) => {
      if (command[0] == '/') {
        let args = command.slice(1).split(' ');
        let cmd = this.commands[args[0]];
        if (cmd) {
          cmd.handler.call(null, args.slice(1));
        } else {
          this.logSystem("Invalid command: " + prefix);
        }
      } else if (command.length > 0) {
        this.addLines('console', command);
        this.api.console(command);
      }
      this.screen.render();
    });
  }

  setAPI(api) {
    this.api = api;

    api.subscribe('/console');
    api.subscribe('/cpu');
    api.subscribe('/code');
    api.on('console', (msg) => {
      let [user, data] = msg;
      if (data.messages) {
        data.messages.log.forEach(l => this.addLines('log', l))
        data.messages.results.forEach(l => this.addLines('result', l))
      }
      if (data.error) this.addLines('error', data.error);
    });
    api.on('message', (msg) => {
      if (msg[0].slice(-4) == "/cpu") {
        let cpu = msg[1].cpu, memory = msg[1].memory;
        this.setGauges(cpu, memory);
      }
    });
    api.on('code', (msg) => {
      this.addLines('system', 'Code updated');
    });

    api.me((err, data) => {
      this.cpuLimit = data.cpu;
      this.memLimit = 2097152;
    });
  }

  addCommand(command, description, handler) {
    this.commands[command] = { description, handler };
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

  focus() {
    this.prompt.focus();
  }

  setGauges(cpu_current, mem_current) {
    if (Number.isNaN(parseInt(cpu_current, 10))) {
      this.cpuLabel.setContent("CPU: ERROR");
      this.cpuBar.setProgress(100);
    } else {
      this.cpuLabel.setContent(printf("CPU: %3d/%3d", cpu_current, this.cpuLimit));
      this.cpuBar.setProgress(cpu_current / this.cpuLimit * 100);
    }
    this.memLabel.setContent(printf("Mem: %4dK/%4dK", mem_current / 1024, this.memLimit / 1024));
    this.memBar.setProgress(mem_current / this.memLimit * 100);
    this.screen.render();
  }

  addLines(type, line) {
    line = line.split("\n").join("\n    ");
    if (type == 'system') {
      this.logView.log('{bold}*** ' + line + '{/bold}');
    } else if (type == 'console') {
      this.logView.log('<<< ' + line);
    } else if (type == 'result') {
      this.logView.log('>>> ' + line);
    } else if (type == 'error') {
      this.logView.log('{red-fg}{bold}!!!{/bold} ' + line + '{/}');
    } else {
      this.logView.log('  - ' + line);
    }

    this.screen.render();
  }

  log(line) {
    this.addLines('system', line);
  }

  commandQuit() {
    this.emit('exit');
  }

  commandHelp() {
    this.addLines('system', 'Available commands:\n' + _.map(this.commands, (cmd, key) => '/' + key + '\t' + cmd.description).join('\n'));

  }
}

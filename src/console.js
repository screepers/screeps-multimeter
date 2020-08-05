const blessed = require("blessed");
const text_prompt = require("./text_prompt");

module.exports = class Console extends blessed.element {
  constructor(opts) {
    super(opts);
    this.outputView = blessed.log({
      parent: this,
      top: 0,
      left: 0,
      bottom: 1,
      scrollback: 5000,
      tags: true,
    });

    this.inputView = new text_prompt({
      parent: this,
      top: "100%-1",
      left: 0,
      height: 1,
      inputOnFocus: true,
      completer: this.handleComplete.bind(this),
      prompt: "<<< ",
      historyFile: opts.historyFile,
      style: { inverse: true },
    });

    this.statusView = blessed.text({
      parent: this.inputView,
      width: 0,
      right: 0,
      align: 'right',
      content: '',
      bold: true,
      bg: 'black',
      fg: 'red',
    });

    this.inputView.key("escape", (ch, key) => {
      this.emit("exit");
    });

    this.inputView.key("pageup", (ch, key) => {
      this.outputView.scroll(-this.outputView.height + 1);
      this.screen.render();
    });

    this.inputView.key("pagedown", (ch, key) => {
      this.outputView.scroll(this.outputView.height - 1);
      this.screen.render();
    });

    this.inputView.on("line", l => this.emit("line", l));
  }

  handleComplete(line) {
    if (this.completer) {
      return this.completer.call(null, line);
    } else {
      return [[], line];
    }
  }

  focus() {
    this.inputView.focus();
  }

  clear() {
    this.outputView.setContent('');
  }

  addLines(type, line, shard) {
    let event = { type, line, shard };
    this.emit("addLines", event);
    line = event.line || line;
    if (shard) {
        line = "{grey-fg}" + shard + "{/} " + line;
    }
    line = line.split("\n").join("\n    ");
    if (event.skip) {
      return;
    } else if (event.formatted) {
      this.outputView.log(line + "{/}");
    } else if (type == "system") {
      this.outputView.log("{bold}*** " + line + "{/}");
    } else if (type == "console") {
      this.outputView.log("<<< " + line + "{/}");
    } else if (type == "result") {
      this.outputView.log(">>> " + line + "{/}");
    } else if (type == "error") {
      this.outputView.log("{red-fg}{bold}!!!{/bold} " + line + "{/}");
    } else {
      this.outputView.log("  - " + line + "{/}");
    }

    this.screen.render();
  }

  setStatus(text) {
    if (text) {
      this.statusView.content = '[' + text + ']';
      this.statusView.width = null;
    } else {
      this.statusView.content = '';
      this.statusView.width = 0;
    }
  }

  log(line) {
    this.addLines("system", line);
  }
};

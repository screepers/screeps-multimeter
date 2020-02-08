const blessed = require("blessed");
const text_prompt = require("./text_prompt");
const fs = require('fs');

module.exports = class Console extends blessed.element {
  constructor(opts) {
    super(opts);
    this.outputView = blessed.log({
      parent: this,
      top: 0,
      left: 0,
      bottom: 1,
      scrollback: 5000,
      tags: true
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
    
    if (opts.logFile) {
      this.logStream = fs.createWriteStream(opts.logFile, {flags:'a'});
    }
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

  addLines(type, line) {
    let event = { type, line };
    this.emit("addLines", event);
    line = event.line || line;
    if (this.logStream) {
      this.logStream.write(line + "\n");
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

  log(line) {
    this.addLines("system", line);
  }
};

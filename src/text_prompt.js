const readline = require('readline');
const fs = require('mz/fs');
const blessed = require('blessed');
const { Readable, Writable } = require('stream');

module.exports = class TextPrompt extends blessed.box {
  constructor(opts) {
    super(Object.assign({
      keyable: true,
    }, opts));
    this.screen._listenKeys(this);

    if (opts.historyFile) {
      this._historyWriter = Promise.resolve(fs.open(opts.historyFile, 'a'));
      this._loadHistory(opts.historyFile);
    } else {
      this._historyWriter = Promise.resolve(null);
    }

    let rl_input = new Readable(), rl_output = new Writable();
    rl_input._read = function noop() {};
    this.rl = readline.createInterface({
      input: rl_input,
      output: rl_output,
      terminal: true,
      completer: opts.completer,
      historySize: opts.historySize || 5000,
    });
    if (opts.prompt) this.rl.setPrompt(opts.prompt);

    rl_output._write = (chunk, encoding, cb) => cb();

    this.screen.program.input.on('data', (key) => {
      rl_input.push(key);
      this.setContent(this.rl._prompt + this.rl.line);
      this.screen.render();
    });

    this.rl.on('line', (l) => {
      this._appendHistory(l);
      this.emit('line', l)
    });
    this.screen.program.showCursor();
    this.setContent(this.rl._prompt);
  }

  _updateCursor(get) {
    let { cols: cx, rows: cy } = this.rl._getCursorPos();
    let pos = this._getPos();

    cx += pos.aleft;
    cy += pos.atop;

    if (cy === this.screen.program.y && cx === this.screen.program.x) {
      return;
    }

    if (cy === this.screen.program.y) {
      if (cx > this.screen.program.x) {
        this.screen.program.cuf(cx - this.screen.program.x);
      } else if (cx < this.screen.program.x) {
        this.screen.program.cub(this.screen.program.x - cx);
      }
    } else if (cx === this.screen.program.x) {
      if (cy > this.screen.program.y) {
        this.screen.program.cud(cy - this.screen.program.y);
      } else if (cy < this.screen.program.y) {
        this.screen.program.cuu(this.screen.program.y - cy);
      }
    } else {
      this.screen.program.cup(cy, cx);
    }
  }

  _loadHistory(filename) {
    fs.readFile(filename, 'utf-8').then((data) => this.rl.history = data.split("\n").filter((l) => l.length > 0).reverse());
  }

  _appendHistory(line) {
    if (line.length > 0 && line[0] != ' ') {
      this._historyWriter = this._historyWriter
        .then((f) => f ? fs.write(f, line + "\n", null, 'utf-8').then(() => f) : null);
    }
  }
}

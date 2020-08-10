const readline = require("readline");
const fs = require("mz/fs");
const blessed = require("blessed");
const { Readable, Writable } = require("stream");

// Bracketed paste mode start/end markers
const BPM_START = Buffer.from('\u001b[200~');
const BPM_END = Buffer.from('\u001b[201~');
const SHIFT_ENTER = Buffer.from('\u001bOM');
const ESCAPE = '\u001b';

module.exports = class TextPrompt extends blessed.box {
  constructor(opts) {
    super(
      Object.assign(
        {
          keyable: true,
        },
        opts,
      ),
    );
    this.screen._listenKeys(this);

    if (opts.historyFile) {
      this._historyWriter = Promise.resolve(fs.open(opts.historyFile, "a"));
      this._loadHistory(opts.historyFile);
    } else {
      this._historyWriter = Promise.resolve(null);
    }

    let rl_input = new Readable(),
      rl_output = new Writable();
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

    let pasteMode = false;
    let commandBuffer = null;

    this.screen.program.input.on("data", buffer => {
      let rawStart = 0; // The start of parsed but unpushed raw input
      let pos = 0; // Current parser position

      // Return true if the buffer contains the target bytes at the current pos
      function match(target) {
        if (buffer.length < pos + target.length) {
          return false;
        }
        return buffer.compare(target, 0, target.length, pos, pos + target.length) == 0;
      }

      // Flush any input between rawStart and pos, setting rawStart to pos
      function flush() {
        if (rawStart == 0 && pos == buffer.length) {
          rl_input.push(buffer);
        } else if (pos > rawStart) {
          rl_input.push(buffer.slice(rawStart, pos));
        }
        rawStart = pos;
      }

      // Flush raw input up to pos and then skip [length] bytes of input
      function skip(length) {
        flush();
        pos += length;
        rawStart = pos;
      }

      while (pos < buffer.length) {
        let index = buffer.indexOf(ESCAPE, pos);
        if (index == -1) {
          pos = buffer.length;
          break;
        }
        pos = index;
        if (match(BPM_START)) {
          skip(BPM_START.length);
          pasteMode = true;
        } else if (match(BPM_END)) {
          skip(BPM_END.length);
          pasteMode = false;
        } else if (match(SHIFT_ENTER)) {
          skip(SHIFT_ENTER.length);
          pasteMode = true;
          rl_input.push('\n');
          pasteMode = false;
        } else {
          pos++;
        }
      }
      // Push any leftover output
      flush();

      this.setContent(this.rl._prompt + this.rl.line);
      this.screen.render();
    });

    this.rl.on("line", line => {
      this._appendHistory(line);
      if (pasteMode) {
        this.rl.setPrompt('... ');
        if (! commandBuffer) {
          commandBuffer = [line];
        } else {
          commandBuffer.push(line);
        }
      } else {
        this.rl.setPrompt(opts.prompt);
        if (commandBuffer) {
          commandBuffer.push(line);
          line = commandBuffer.join('\n');
          commandBuffer = null;
        }
        this.emit("line", line);
      }
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
    fs.readFile(filename, "utf-8").then(
      data =>
        (this.rl.history = data
          .split("\n")
          .filter(l => l.length > 0)
          .reverse()),
    );
  }

  _appendHistory(line) {
    if (line.length > 0 && line[0] != " ") {
      this._historyWriter = this._historyWriter.then(
        f => (f ? fs.write(f, line + "\n", null, "utf-8").then(() => f) : null),
      );
    }
  }
};

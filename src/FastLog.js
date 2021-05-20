const util = require('util');
const blessed = require("blessed");

/**
 * Modified version of blessed.Log.
 * Copes with adding multiple lines more efficiently.
 */
module.exports = class FastLog extends blessed.Box {
  constructor(opts) {
    super(
      Object.assign({
        scrollable: true,
        alwaysScroll: true,
        keyable: true,
        wrap: true,
      }, opts),
    );

    this.scrollback = opts.scrollback != null ? opts.scrollback : Infinity;
    this.scrollOnInput = opts.scrollOnInput;
    this.pendingLines = [];

    // Add a listener to auto-scroll when the content changes
    this.on('set content', () => {
      if (! this._userScrolled || this.scrollOnInput) {
        process.nextTick(() => {
          this.setScrollPerc(100);
          this._userScrolled = false;
          this.screen.render();
        });
      }
    });
  }

  /**
   * Add a line to the log buffer.
   *
   * NOTE: The line will not be rendered immediately, it will be rendered in the
   * next tick so that multiple lines added in one tick will be rendered
   * efficiently together.
   */
  log(...args) {
    let text = util.format(...args);
    this.emit('log', text);
    if (! this.content) {
      // Bugfix: pushLine works with an array, but not if it's empty
      this.pushLine(text);
      return;
    }
    for (let line of text.split('\n')) {
      this.pendingLines.push(line);
    }
    if (! this.scheduledRender) {
      this.scheduledRender = true;
      process.nextTick(() => {
        this.scheduledRender = false;
        this.pushLine(this.pendingLines);
        this.pendingLines = [];
        if (this._clines.fake.length > this.scrollback) {
          this.shiftLine(this._clines.fake.length - this.scrollback);
        }
      });
    }
  }

  /**
   * Override scroll to keep the _userScrolled flag in sync.
   */
  scroll(offset, always) {
    if (offset === 0) {
      return super.scroll(offset, always);
    }
    this._userScrolled = true;
    let ret = super.scroll(offset, always);
    if (this.getScrollPerc() === 100) {
      this._userScrolled = false;
    }
    return ret;
  }
};

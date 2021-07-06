const assert = require('assert');
const HtmlPlugin = require('../../plugins/html');

let listener = null;
let mmStub = {
  console: {
    on: function (event, fn) {
      listener = fn;
    },
  },
};
HtmlPlugin(mmStub);

function compare(input, expected, eventType = 'log') {
  let event = {
    type: eventType,
    line: input,
  };
  listener(event);
  assert.equal(event.line, expected);
}

describe('html plugin', function () {
  it('should return plain text unchanged', function () {
    compare('plain text', 'plain text');
  });

  it('should ignore unknown HTML tags', function () {
    compare('A<hr />B', 'AB');
  });

  it('should retain text from inside HTML tags', function () {
    compare('A <span>B</span> C', 'A B C');
  });

  it('should parse color, background, font-weight and text-decoration', function () {
    compare(
      'A<span style="color:red;background:white;font-weight:bold;text-decoration:underline">B</span>C',
      'A{red-fg}{white-bg}{bold}{underline}B{/underline}{/bold}{/white-bg}{/red-fg}C',
    );
  });

  it('should support nested styles', function () {
    compare(
      'A<span style="color:red">B<span style="font-weight:bold">C</span>D</span>E',
      'A{red-fg}B{bold}C{/bold}D{/red-fg}E',
    );
  });

  it('should close nested tags if the parent is closed first', function () {
    compare(
      'A<div style="color:red">B<span style="font-weight:bold">C</div>D',
      'A{red-fg}B{bold}C{/bold}{/red-fg}D',
    );
  });

  it('should decode HTML entities', function () {
    compare('A &lt; B', 'A < B');
  });

  it('should preserve unparsed "<" characters as text', function () {
    compare('A < B', 'A < B');
    compare('A <- B', 'A <- B');
    compare('A <= B', 'A <= B');
    compare('A<=>', 'A<=>');
    compare('A<10>', 'A<10>');
    compare('A < B and B > C', 'A < B and B > C');
    compare('foo < bar <span>C</span>', 'foo < bar C');
    compare('foo<<span>bar</span>', 'foo<bar');
  });

  it('should parse result line', function () {
    compare(
      'A<div style="color:red">B<span style="font-weight:bold">C</div>D',
      'A{red-fg}B{bold}C{/bold}{/red-fg}D',
      'result'
    );
  });
});

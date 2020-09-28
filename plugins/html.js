const htmlparser = require('htmlparser2');

module.exports = function(multimeter) {
  multimeter.console.on("addLines", function(event) {
    if (event.type === "log") {
      event.line = parseLogHtml(event.line);
      event.formatted = true;
    }
  });
};

let stack, output;
let parser = new htmlparser.Parser({
  onopentag(name, attrs) {
    let tag = {
      tag: name,
      styles: [],
    };
    if (attrs.style) {
      for (let entry of attrs.style.split(';')) {
        let parts = entry.split(':');
        if (parts.length >= 2) {
          let key = parts[0].trim();
          let value = parts[1].trim();
          switch (key) {
            case 'color':
              tag.styles.push(value + '-fg');
              break;
            case 'background':
              tag.styles.push(value + '-bg');
              break;
            case 'font-weight':
              if (value == 'bold') {
                tag.styles.push('bold');
              }
              break;
            case 'text-decoration':
              if (value == 'underline') {
                tag.styles.push('underline');
              }
              break;
          }
        }
      }
      stack.push(tag);
      for (let style of tag.styles) {
        output += `{${style}}`;
      }
    }
  },

  ontext(text) {
    output += text;
  },

  onclosetag(name) {
    // Find the last matching tag
    let i;
    for (i = stack.length - 1; i >= 0; i--) {
      if (stack[i].tag == name) {
        break;
      }
    }
    if (i >= 0) {
      // Pop this tag and anything nested inside it (even if they haven't been closed yet)
      while (stack.length > i) {
        let tag = stack.pop();
        for (let style of tag.styles.reverse()) {
          output += `{/${style}}`;
        }
      }
    }
  },
}, {
  recognizeSelfClosing: true,
});

function parseLogHtml(line) {
  stack = [];
  output = '';
  parser.write(line);
  parser.end();
  return output;
}

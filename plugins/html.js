const parse5 = require('parse5');

module.exports = function(multimeter) {
  multimeter.console.on("addLines", function(event) {
    if (event.type === "log" || event.type === "result") {
      event.line = parseLogHtml(event.line);
      event.formatted = true;
    }
  });
};

function parseLogHtml(line) {
  let output = '';
  let nodes = parse5.parse('<body>' + line + '</body>').childNodes[0].childNodes[1].childNodes;
  function parseStyle(style) {
    let styles = [];
    for (let entry of style.split(';')) {
      let parts = entry.split(':');
      if (parts.length >= 2) {
        let key = parts[0].trim();
        let value = parts[1].trim();
        switch (key) {
          case 'color':
            styles.push(value + '-fg');
            break;
          case 'background':
            styles.push(value + '-bg');
            break;
          case 'font-weight':
            if (value === 'bold') {
              styles.push('bold');
            }
            break;
          case 'text-decoration':
            if (value === 'underline') {
              styles.push('underline');
            }
            break;
        }
      }
    }
    return styles;
  }
  function traverseNodes(nodes) {
    for (let node of nodes) {
      let styles = null;
      if (node.attrs) {
        for (let attr of node.attrs) {
          if (attr.name === 'style') {
            styles = parseStyle(attr.value);
            for (let style of styles) {
              output += `{${style}}`;
            }
          }
        }
      }
      if (node.nodeName === '#text') {
        output += node.value;
      }
      if (node.childNodes) {
        traverseNodes(node.childNodes);
      }
      if (styles) {
        for (let style of styles.reverse()) {
          output += `{/${style}}`;
        }
      }
    }
  }
  traverseNodes(nodes);
  return output;
}

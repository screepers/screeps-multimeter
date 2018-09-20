const _ = require("lodash");

let colors = [
  "{cyan-fg}",
  "{green-fg}",
  "{blue-fg}",
  "{gray-fg}",
  "{red-fg}",
  "{yellow-fg}{red-bg}",
];

module.exports = function(multimeter) {
  if (multimeter.config.screeps_console_compat) {
    multimeter.console.on("addLines", function(event) {
      if (event.line.startsWith("STATS")) {
        event.skip = true;
        return;
      }
      if (event.type == "log") {
        event.line = processLogLine(event.line);
        event.formatted = true;
      }
    });
  }
};

function processLogLine(line) {
  let tagRegex = /<([\w-]+)(.+?)>/;
  let closeRegex = /<\/([\w-]+)(.+?)>/;
  let attrRegex1 = / (\w+)="(.+?)"/g;
  let attrRegex2 = / (\w+)="(.+?)"/;
  let [, tag, rawAttrs] = line.match(tagRegex) || [];
  if (tag) {
    line = line.replace(tagRegex, "").replace(closeRegex, "{/}");
  }
  let attrs = {};
  if (rawAttrs) {
    rawAttrs.match(attrRegex1).forEach(p => {
      let [r, k, v] = p.match(attrRegex2) || [];
      attrs[k] = v;
    });
  }
  if (tag == "log") line = colors[attrs.severity || 3] + line;
  return line;
}

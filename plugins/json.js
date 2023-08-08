const parse5 = require('parse5');

module.exports = function(multimeter) {
  multimeter.console.on("addLines", function(event) {
    let jsonFormattingEnabled = multimeter.config.json;
    if (jsonFormattingEnabled && (event.type === "log" || event.type === "result")) {
      try {
        let obj = JSON.parse(event.line);
        event.line = JSON.stringify(obj, null, 1)
      } catch (e) {
        // not a json line
      }
    }
  });
};

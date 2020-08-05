const blessed = require("blessed");

const HELP_TEXT =
  "/filter [string]  Filter out console messages unless they contain the string.\n" +
  "/filter           Disable filtering.";

module.exports = function(multimeter) {
  let filterString = null;
  let filterCount = 0;

  multimeter.console.on("addLines", function(event) {
    if (filterString && event.type == "log") {
      let line = event.shard + ' ' + event.line;
      if (! line.includes(filterString)) {
        event.skip = true;
        filterCount++;
        multimeter.updateStatus();
      }
    }
  });

  multimeter.addStatus(function () {
    if (filterString) {
      return 'FILTERED ' + filterCount;
    }
  });

  function commandFilter(args) {
    if (args.length == 0) {
      filterString = null;
    } else {
      filterString = args.join(' ');
      filterCount = 0;
    }
    multimeter.updateStatus();
  }

  multimeter.addCommand("filter", {
    description: "Filter the console output.",
    helpText: HELP_TEXT,
    handler: commandFilter,
  });
};

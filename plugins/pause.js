const blessed = require("blessed");

const HELP_TEXT =
  "/pause   Pause the console output.\n" +
  "/unpause Resume the console output.";

module.exports = function(multimeter) {
  let paused = false;

  multimeter.console.on("addLines", function(event) {
    if (paused && event.type == "log") {
      event.skip = true;
    }
  });

  let pausedMessage = blessed.box({
    parent: multimeter.screen,
    bottom: 1,
    height: 1,
    left: "center",
    align: "center",
    width: 20,
    content: "***** PAUSED *****",
    bold: true,
    hidden: true,
  });

  function commandPause() {
    paused = true;
    pausedMessage.show();
  }

  function commandUnpause() {
    paused = false;
    pausedMessage.hide();
  }

  multimeter.addCommand("pause", {
    description: "Pause the console output.",
    helpText: HELP_TEXT,
    handler: commandPause,
  });
  multimeter.addCommand("unpause", {
    description: "Resume the console output.",
    helpText: HELP_TEXT,
    handler: commandUnpause,
  });
};

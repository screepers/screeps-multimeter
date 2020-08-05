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

  multimeter.addStatus(function () {
    if (paused) {
      return 'PAUSED';
    }
  });

  function setPaused(value) {
    paused = !! value;
    multimeter.updateStatus();
  }

  function commandPause() {
    setPaused(true);
  }

  function commandUnpause() {
    setPaused(false);
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

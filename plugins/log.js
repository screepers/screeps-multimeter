const fs = require("fs");
const logFile = fs.createWriteStream("screeps.log", { flags: "a" });
const errorLogFile = fs.createWriteStream("screeps.errors.log", { flags: "a" });

module.exports = function(multimeter) {
  let enabled = multimeter.config.log === "true";

  function toggleLogging() {
    if (!enabled) {
      enabled = true;
      multimeter.config.log = "true";
      multimeter.log("Enabled logging");
    } else {
      enabled = false;
      multimeter.config.log = "false";
      multimeter.log("Disabled logging");
    }
  }

  multimeter.console.on("addLines", function(event) {
    if (!enabled) return;
    const msg = new Date().toISOString() + ": " + event.line + "\n";
    if (event.type === "log") {
      logFile.write(msg);
    } else if (event.type === "error") {
      if (multimeter.config.errorLogFile === "true") {
        errorLogFile.write(msg);
      } else {
        logFile.write(msg);
      }
    }
  });

  multimeter.addCommand("log", {
    description: "Log all console entries to a log file",
    helpText: "Enable/Disable logging to txt file",
    handler: toggleLogging,
  });
};

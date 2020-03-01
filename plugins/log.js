const fs = require("fs");

module.exports = function(multimeter) {
  let log = multimeter.config.logFilename;
  if (!log) return;
  let errorLog = log || multimeter.config.errorLogFilename;

  const logFile = fs.createWriteStream(log, { flags: "a" });
  const errorLogFile = fs.createWriteStream(errorLog, { flags: "a" });

  multimeter.console.on("addLines", function(event) {
    const msg = new Date().toISOString() + ": " + event.line + "\n";
    if (event.type === "log") {
      logFile.write(msg);
    } else if (event.type === "error") {
      errorLogFile.write(msg);
    }
  });
};

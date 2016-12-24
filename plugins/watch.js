const HELP_TEXT =
"Log the result of an expression to your console every tick. This plugin requires watch-client.js to be installed in your script.\n" +
"\n" +
"/watch EXPR    Log EXPR every tick.\n" +
"/watch off     Disable the saved watch.\n" +
"/watch         Show the current watch expression.";

module.exports = function(multimeter) {
  function setWatch(args) {
    if (args.length == 0) {
      multimeter.api.memory.get('watch').then((expr) => {
        if (expr) {
          multimeter.log("Currently watching:", expr.toString());
        } else {
          multimeter.log("No current watch");
        }
      });
    } else if (args[0] == "off") {
      multimeter.api.memory.set('watch', null).then(() => {
        multimeter.log("Watch disabled.");
      });
    } else {
      let expr = args.join(" ");
      multimeter.api.memory.set('watch', expr);
    }
  }

  multimeter.addCommand("watch", {
    description: 'Log an expression to the console every tick.',
    helpText: HELP_TEXT,
    handler: setWatch,
  });
};

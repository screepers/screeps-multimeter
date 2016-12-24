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
    handler: setWatch,
  });
};

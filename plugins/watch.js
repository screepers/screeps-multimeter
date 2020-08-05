const blessed = require("blessed");
const _ = require("lodash");

const HELP_TEXT =
  "Monitor the result of an expression every tick. This plugin requires watch-client.js to be installed in your script.\n" +
  "\n" +
  "/watch TARGET EXPR  Monitor EXPR every tick.\n" +
  "/watch TARGET off   Disable the watch.\n" +
  "/watch TARGET       Show the current watch expression.\n" +
  "\n" +
  "Target can be 'console', which will cause the result to be logged every tick, or 'status', which will cause the result to be shown in a status bar at the bottom of the screen. There can be separate status and console watches.";

module.exports = function(multimeter) {
  let watchShards = multimeter.config.watchShards || [];

  let status_bar;
  let shardsVerified = new Set();
  let subscriptions = new Set();
  let statusValues = {};

  function subscribe(shard, name) {
    if (name == "console") return;
    let endpoint = "memory/" + shard + "/watch.values." + name;
    if (subscriptions.has(endpoint)) return;
    subscriptions.add(endpoint);
    multimeter.api.socket.subscribe(endpoint);
    if (name == "status") {
      statusValues[shard] = '';
      updateStatusBar();
      if (watchShards.indexOf(shard) == -1) {
        watchShards.push(shard);
        watchShards.sort();
        multimeter.config.watchShards = watchShards;
        multimeter.configManager.saveConfig();
      }
      multimeter.api.socket.on(endpoint, ({data}) => {
        if (shard in statusValues) {
          statusValues[shard] = data;
        }
        updateStatusBar();
      });
    }
  }

  function unsubscribe(shard, name) {
    if (name == "console") return;
    let endpoint = "memory/" + shard + "/watch.values." + name;
    if (name == "status") {
      delete statusValues[shard];
      updateStatusBar();
    }
    subscriptions.delete(endpoint);
    multimeter.api.socket.unsubscribe(endpoint);
  }

  function errorHandler(err) {
    multimeter.log("Cannot watch: " + err.stack);
  }

  function getWatchExpressions(shard) {
    return multimeter.api.memory
      .get("watch", shard)
      .then(val => {
        if (val) {
          if (val.data && val.data.expressions) {
            shardsVerified.add(shard);
            return val.data.expressions;
          } else {
            multimeter.log('Watch plugin disabled: Missing Memory.watch.expressions for ' + shard + '. Is watch-client.js installed?');
            return null;
          }
        } else {
          multimeter.log('Watch plugin disabled: Missing Memory.watch for ' + shard + '. Is watch-client.js installed?');
          return null;
        }
      })
  }

  function setWatch(name, expression) {
    let shard = multimeter.shard;
    if (! shardsVerified.has(shard)) {
      return getWatchExpressions(shard).then(expressions => {
        if (expressions) {
          setWatch(name, expression);
        }
      });
    }
    if (expression) {
      subscribe(shard, name);
    } else {
      unsubscribe(shard, name);
    }
    return multimeter.api.memory.set("watch.expressions." + name, expression, shard);
  }

  function updateStatusBar() {
    let shards = Object.keys(statusValues).sort();
    if (shards.length > 0) {
      if (!status_bar) {
        status_bar = blessed.box({
          parent: multimeter.screen,
          left: 0,
          tags: true,
        });
      }
      status_bar.height = shards.length;
      status_bar.top = '100%-' + shards.length;
      multimeter.console.position.bottom = shards.length;
      let text = shards.map(shard => '{grey-fg}' + shard + '{/} ' + statusValues[shard]).join('\n');
      status_bar.setContent(text);
      multimeter.screen.render();
    } else if (status_bar) {
      status_bar.detach();
      status_bar = null;
      multimeter.console.position.bottom = 0;
      multimeter.screen.render();
    }
  }

  function commandWatch(args) {
    let target = args[0] || "console";
    if (target != "console" && target != "status") {
      multimeter.log("Valid targets are 'console' and 'status'.");
    }
    let shard = multimeter.shard;
    if (args.length < 2) {
      getWatchExpressions(shard)
        .then(expressions => {
          if (expressions && expressions[target]) {
            multimeter.log(
              "Currently watching:",
              expressions[target].toString(),
            );
          } else {
            multimeter.log("No " + target + " watch for " + shard + ".");
          }
        })
        .catch(errorHandler);
    } else if (args[1] == "off") {
      setWatch(target, null)
        .then(() => {
          multimeter.log(target + " watch disabled for " + shard + ".");
        })
        .catch(errorHandler);
    } else {
      let expr = args.slice(1).join(" ");
      setWatch(target, expr).catch(errorHandler);
    }
  }

  multimeter.api.socket.on("connected", () => {
    watchShards.forEach(shard => {
      getWatchExpressions(shard).then(expressions => {
        if (expressions && expressions.status) {
          subscribe(shard, "status");
        }
      });
    });
  });

  multimeter.addCommand("watch", {
    description: "Log an expression to the console every tick.",
    helpText: HELP_TEXT,
    handler: commandWatch,
  });
};

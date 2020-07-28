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

const HELP_TEXT_WATCH =
  "Set or show the shard used by the Watch plugin." +
  "\n" +
  "/watchshard SHARD   Set the shard used by the Watch plugin.\n" +
  "/watchshard         Show the current selected shard." +
  "\n" +
  'If SHARD is a number, it will be prefixed with "shard", so "/shard 2" will set the shard to shard2.'
  
module.exports = function(multimeter) {
  if (!multimeter.config.watchShard) {
    multimeter.config.watchShard = multimeter.config.shard;
    multimeter.configManager.saveConfig();
  }

  let status_bar,
    client_verified = false,
    subscriptions = new Set();

  function subscribe(name) {
    if (name == "console") return;
    if (subscriptions.has(name)) return;
    subscriptions.add(name);
    multimeter.api.socket.subscribe("memory/"+multimeter.config.watchShard+"/watch.values." + name);
  }

  function unsubscribe(name) {
    if (name == "console") return;
    if (name == "status") setStatusBar(null);
    subscriptions.delete(name);
    multimeter.api.socket.unsubscribe("memory/"+multimeter.config.watchShard+"/watch.values." + name);
  }

  function errorHandler(err) {
    multimeter.log("Cannot watch: " + err.stack);
  }

  function getWatchExpressions() {
    return multimeter.api.memory
      .get("watch", multimeter.config.watchShard)
      .then(val => {
        if (val) {
          if (val.data && val.data.expressions) {
            client_verified = true;
            return val.data.expressions;
          } else {
            multimeter.log('Watch plugin disabled: no expressions found for active shard.')
          }
        } else {
          multimeter.log('Watch plugin disabled: watch-client.js is not installed or out of date.');
        }
      })
      .then(expressions => {
        _.keys(expressions).forEach(subscribe);
        return expressions;
      });
  }

  function setWatch(name, expression) {
    if (!client_verified)
      return getWatchExpressions().then(setWatch.bind(null, name, expression));
    if (expression) subscribe(name);
    else unsubscribe(name);
    return multimeter.api.memory.set("watch.expressions." + name, expression, multimeter.config.watchShard);
  }

  function setStatusBar(value) {
    if (value !== null) {
      if (!status_bar) {
        status_bar = blessed.box({
          parent: multimeter.screen,
          top: "100%-1",
          left: 0,
          height: 1,
          tags: true,
        });
        multimeter.console.position.bottom = 1;
      }
      status_bar.setContent(value);
      multimeter.screen.render();
    } else if (status_bar) {
      status_bar.detach();
      status_bar = null;
      multimeter.console.position.bottom = 0;
      multimeter.screen.render();
    }
  }

  function onShard(shard) {
    // connects to memory websocket for specified shard; disconnects upon shard change.
    subscriptions.clear();
    getWatchExpressions().catch(errorHandler);
    multimeter.api.socket.on("memory/"+shard+"/watch.values.status", ({data}) => {
      if (shard === multimeter.config.watchShard) {
        setStatusBar(data);
      } else {
        unsubscribe("status");
      }
    });
  }

  function commandWatchShard(args) {
    if (args.length > 0) {
      let shard = args[0];
      if (shard.match(/^[0-9]+$/)) {
        shard = 'shard' + shard;
      }
    multimeter.config.watchShard = shard;
    multimeter.configManager.saveConfig();
    onShard(shard);
    }
    multimeter.log("Watch Shard: "+ multimeter.config.watchShard);
  }

  function commandWatch(args) {
    let target = args[0] || "console";
    if (target != "console" && target != "status") {
      multimeter.log("Valid targets are 'console' and 'status'.");
    }
    if (args.length < 2) {
      getWatchExpressions()
        .then(expressions => {
          if (expressions && expressions[target]) {
            multimeter.log(
              "Currently watching:",
              expressions[target].toString(),
            );
          } else {
            multimeter.log("No current watch.");
          }
        })
        .catch(errorHandler);
    } else if (args[1] == "off") {
      setWatch(target, null)
        .then(() => {
          multimeter.log("Watch disabled.");
        })
        .catch(errorHandler);
    } else {
      let expr = args.slice(1).join(" ");
      setWatch(target, expr).catch(errorHandler);
    }
  }

  multimeter.api.socket.on("connected", () => {
    onShard(multimeter.config.watchShard);
  });

  multimeter.addCommand("watch", {
    description: "Log an expression to the console every tick.",
    helpText: HELP_TEXT,
    handler: commandWatch,
  });
  
  multimeter.addCommand("wshard", {
    description: "Set or show the shard used by the Watch plugin.",
    helpText: HELP_TEXT_WATCH,
    handler: commandWatchShard,
  });
};

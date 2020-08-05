const _ = require("lodash");

const HELP_TEXT =
  "Create and update aliases (command shortcuts).\n" +
  "\n" +
  "/alias NAME          Show the current value of the NAME alias.\n" +
  "/alias NAME COMMAND  Register NAME as an alias for COMMAND.\n" +
  "/aliases             List all available aliases.\n" +
  "/delalias NAME       Remove the alias for NAME.\n" +
  "\n" +
  "Aliases can have parameters, which can be substituted using $args (all arguments), $1 (the first argument), $2, etc.";

module.exports = function(multimeter) {
  let aliases = {};

  function addAlias(name, command, opts) {
    opts = opts || {};

    aliases[name] = command;
    multimeter.addCommand(name, {
      description:
        "Alias for: " +
        (command.length > 100 ? command.slice(0, 97) + "..." : command),
      handler: commandRunAlias.bind(null, name),
    });

    if (opts.save !== false) {
      multimeter.config.aliases = aliases;
      multimeter.configManager.saveConfig();
    }
  }

  function delAlias(name) {
    name = _.find(_.keys(aliases), a => a.toLowerCase() == name.toLowerCase());
    if (name) {
      delete aliases[name];
      multimeter.removeCommand(name);

      multimeter.config.aliases = aliases;
      multimeter.configManager.saveConfig();

      return true;
    } else {
      return false;
    }
  }

  // Load aliases
  if (typeof multimeter.config.aliases === "object") {
    _.each(multimeter.config.aliases, (command, name) => {
      if (typeof command === "string") {
        addAlias(name, command, { save: false });
      }
    });
  }

  function commandAddAlias(args) {
    if (args.length == 0) {
      multimeter.log("See /help alias for usage.");
    } else if (args.length == 1) {
      let alias = _.find(
        aliases,
        (_, k) => k.toLowerCase() == args[0].toLowerCase(),
      );
      if (alias) {
        multimeter.log(args[0] + " is aliased to: " + alias);
      } else {
        multimeter.log(args[0] + " is not an alias.");
      }
    } else {
      let name = args[0],
        command = args.slice(1).join(" ");
      addAlias(name, command);
      multimeter.log("Alias saved for " + name + ".");
    }
  }

  function commandRunAlias(command, args) {
    let substituted = aliases[command].replace(
      /\$(\*)?(\$|args\b|\d+\b)/g,
      (_, raw, name) => {
        if (name == "$") return "$";
        if (name == "args") return JSON.stringify(args.join(" "));
        let arg = args[parseInt(name, 10) - 1];
        return arg ? (raw ? arg.toString() : JSON.stringify(arg)) : "void(0)";
      },
    );
    multimeter.handleConsoleLine(substituted);
  }

  function commandListAliases(args) {
    let label = "aliases",
      matched;
    if (args.length > 0) {
      label = 'aliases containing "' + args[0] + '"';
      matched = _.keys(aliases).filter(
        name => name.toLowerCase().indexOf(args[0].toLowerCase()) != -1,
      );
    } else {
      matched = _.keys(aliases);
    }
    if (_.isEmpty(matched)) {
      multimeter.log("There are no " + label + ".");
    } else {
      matched = matched.sort();
      let longest = _.max(_.map(matched, c => c.length));
      multimeter.log(
        "List of " +
          label +
          ":\n" +
          _.map(
            matched,
            c =>
              _.padEnd(c, longest) +
              "  " +
              multimeter.commands[c.toLowerCase()].description,
          ).join("\n"),
      );
    }
  }

  function commandDelAlias(args) {
    if (args.length == 0) {
      multimeter.log("See /help alias for usage.");
    } else {
      if (delAlias(args[0])) {
        multimeter.log("Alias for " + args[0] + " removed.");
      } else {
        multimeter.log("There is already no alias for " + args[0] + ".");
      }
    }
  }

  multimeter.addCommand("alias", {
    description: "Create or update aliases.",
    helpText: HELP_TEXT,
    handler: commandAddAlias,
  });
  multimeter.addCommand("aliases", {
    description: "List all available aliases.",
    helpText: HELP_TEXT,
    handler: commandListAliases,
  });
  multimeter.addCommand("delalias", {
    description: "Remove an alias.",
    helpText: HELP_TEXT,
    handler: commandDelAlias,
  });
};

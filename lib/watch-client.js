module.exports = function() {
  if (typeof Memory.watch !== "object") {
    Memory.watch = {};
  }
  if (typeof Memory.watch.expressions !== "object") {
    Memory.watch.expressions = {};
  }
  if (typeof Memory.watch.values !== "object") {
    Memory.watch.values = {};
  }
  _.each(Memory.watch.expressions, (expr, name) => {
    if (typeof expr !== "string") return;
    let result;
    try {
      result = eval(expr);
    } catch (ex) {
      result = "Error: " + ex.message;
    }
    if (name == "console") {
      if (typeof result !== "undefined") console.log(result);
    } else {
      Memory.watch.values[name] =
        typeof result !== "undefined" ? result.toString() : result;
    }
  });
};

module.exports = function() {
  try {
    if (Memory.watch && typeof Memory.watch === 'string') {
      let result = eval(Memory.watch);
      if (typeof result !== 'undefined') {
        console.log(result);
      }
    }
  } catch (ex) {
    console.log("Cannot watch:", ex);
  }
};

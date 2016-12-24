module.exports = function() {
  if (Memory.watch && typeof Memory.watch === 'string') {
    let result = eval(Memory.watch);
    if (typeof result !== 'undefined') {
      console.log(result);
    }
  }
};

/**
 * bind wraps a function.
 * @param {Function} fn The function to be called.
 * @param {*} thisArg The 'this' of the invoked fn.
 * @param {...*} [args] Arguments to add to the start of the function call.
 * @returns {Function}
 */
export function bind(fn, thisArg, args) {
  args = arguments;
  if (!Function.prototype.bind) {
    return function() {
      return fn.apply(thisArg, Array.prototype.concat.call(args, arguments));
    };
  }
  return Function.prototype.bind.apply(fn, [thisArg].concat(args));
}

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.output = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  document.getElementById("useragent").appendChild(document.createTextNode(navigator.userAgent));
  return function output(action) {
    // Reset the output.
    var stdout = document.getElementById('output');
    var stderr = document.getElementById('output-error');
    stdout.innerHTML = stderr.innerHTML = '';

    // Collect the output.
    var output, error;
    try {
      output = action();
    } catch (e) {
      error = e;
    }

    // Show the output.
    if (output) stdout.appendChild(document.createTextNode(output));
    if (error) stderr.appendChild(document.createTextNode(error));
  }
}));
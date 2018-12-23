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

  if (document.addEventListener) {
    document.addEventListener("DOMContentLoaded", function() {
      document.getElementById("cookies").appendChild(document.createTextNode(document.cookie));

      var cookies = document.cookie.split('; ');
      for (var i = cookies.length-1; i >= 0; i--) {
        var x = cookies[i].split('=');
        var cookieName = x[0];
        var cookieVal = x[1];

        if (cookieName === 'ravelinDeviceId') {
          document.getElementById("deviceid").appendChild(document.createTextNode(cookieVal));
        } else if (cookieName === 'ravelinSessionId'){
          document.getElementById("sessionid").appendChild(document.createTextNode(cookieVal));
        }
      };
    });
  }

  return function output(outputId, action) {
    // Reset the output.
    var stdout = document.getElementById(outputId);
    var stderr = document.getElementById(outputId + '-error');
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

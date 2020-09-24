/**
 * run immediately invokes fn() and returns its return value while
 * printing it to <div id=output>. Any exceptions thrown are swallowed
 * and printed to <div id=error>. If fn returns a promise then that promise is
 * returned, and its pass/fail result is logged.
 */
function run(outId, errId, fn) {
  if (arguments.length === 1) {
    fn = outId;
    outId = 'output';
    errId = 'error';
  }
  var out = document.getElementById(outId),
    err = document.getElementById(errId);
  out.innerHTML = '';
  err.innerHTML = '';
  try {
    var o = fn();
    if (o && o.then) {
      o.then(pass, fail);
    } else {
      pass(o);
    }
    return o;
  } catch (e) {
    fail(e);
    throw e;
  }

  function pass(o) {
    if (typeof o === 'undefined') return;
    var m = o.toString();
    if (m === ({}).toString()) {
      try {
        m = JSON.stringify(o);
      } catch (e) { }
    }
    out.appendChild(document.createTextNode(m));
  }

  function fail(e) {
    var em = e.message;
    if (e.name) em = e.name + ": " + em;
    if (e.stack) em = em + "\nStack: " + e.stack;
    err.appendChild(document.createTextNode(em));
  }
}

/**
 * parseQuery returns the queryString as an object of properties.
 * @param {string} queryString window.location.search
 */
function parseQuery(queryString) {
  var query = {};
  var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  return query;
}

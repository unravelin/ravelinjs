/**
 * done marks the test page as finished.
 */
function done() {
  document.body.id = 'completed';
}

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
    out.appendChild(document.createTextNode(stringify(o)));
  }

  function fail(e) {
    err.appendChild(document.createTextNode(stringify(e)));
  }

  function stringify(v) {
    if (v instanceof Error) {
      var em = v.message;
      if (v.name) em = v.name + ": " + em;
      if (v.stack) em = em + "\nStack: " + v.stack;
      return em;
    }

    var m = v.toString();
    if (m === ({}).toString()) {
      try {
        m = JSON.stringify(v);
      } catch (e) { }
    }
    return m;
  }
}

/**
 * parseQuery returns the queryString as an object of properties.
 * https://stackoverflow.com/a/13419367/123600
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

function keysMatch(req, key) {
  var i = req.url.indexOf('?');
  if (i == -1) return false;
  return parseQuery(req.url.substr(i)).key == key;
}

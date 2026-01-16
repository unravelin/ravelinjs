/**
 * isolate returns the cfg instance with a few isolating test defaults added.
 * The ns option is for isolate only, and is not passed through to Ravelin. All
 * other properties documented here are the defaults.
 *
 * @param {object} cfg
 * @param {string} [cfg.ns=testn] A namespace added to the cookie names. Not
 * used by this function.
 * @param {string} [cfg.cookie=ravelinDeviceId-ns]
 * @param {int} [cfg.syncMs=30000]
 * @returns {object} The mutated cfg.
 */
function isolate(cfg) {
  if (!isolate.n) isolate.n = 0;
  var ns = cfg.ns || 'test' + isolate.n++;
  delete cfg.ns;

  if (!('cookie' in cfg)) {
    cfg.cookie = 'ravelinDeviceId-' + ns;
  }
  if (!('sessionCookie' in cfg)) {
    cfg.sessionCookie = 'ravelinSessionId-' + ns;
  }
  if (!('syncMs' in cfg)) {
    cfg.syncMs = 30000;
  }
  return cfg;
}

// eslint-disable-next-line no-redeclare
function keysMatch(req, key) {
  var i = req.url.indexOf('?');
  if (i === -1) return false;
  return parseQuery(req.url.substring(i)).key == key;
}

/**
 * parseQuery returns the queryString as an object of properties.
 * https://stackoverflow.com/a/13419367/123600
 * @param {string} queryString window.location.search
 */
function parseQuery(queryString) {
  var query = {};
  var pairs = (queryString[0] === '?' ? queryString.substring(1) : queryString).split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  return query;
}

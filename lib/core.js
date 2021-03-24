/**
 * The core module of ravelinjs provides device-identification, and is used by
 * other modules to communicate with the Ravelin API.
 */

import version from './version';
import { CookieJar } from './cookies';
import { promiseRetry, bind, uuid } from './util';

/**
 * @typedef {object} CoreConfig
 * @prop {string} [key] The API key ("publishable_key_..." or "pk_...") used to authenticate with the Ravelin API.
 * @prop {string} [api] A string of the format "https://api.ravelin.net" which forms the base of API requests.
 * @prop {string|Promise<string>} [id] An explicit deviceId to use. If the Promise errors or returns an empty value, Ravelin's own deviceId tracking kicks in.
 * @prop {string} [cookie=ravelinDeviceId] The name of the cookie that the deviceId is kept in.
 * @prop {string} [cookieDomain] The domain on which to set cookies. Ignored if invalid.
 * @prop {number} [cookieExpiryDays=365] The max lifetime of a deviceId, in days.
 * @prop {number} [syncMs=2000] The sync timeout frequency.
 * @prop {number} [sendRetryMs=150] The send retry backoff time.
 * @prop {PromiseConstructor} Promise The Promise implementation to use in ravelinjs's asychnrous functions.
 */

/**
 * Core library instance. Provides helpers and device identification.
 * @class
 * @param {CoreConfig} cfg
 */
export function Core(cfg) {
  this.Promise = cfg.Promise;

  // API connectivity.
  this.key = cfg.key;
  this.api = cfg.api || apiFromKey(this.key);
  this.api = this.api[0] + this.api.substr(1).replace(/^\/+|\/$/g, '');
  this.sendRetryMs = cfg.sendRetryMs || 150;
  this.cookie = cfg.cookie || 'ravelinDeviceId';
  this.cookieExpiryDays = cfg.cookieExpiryDays || 365;
  this.cookies = new CookieJar({
    domain: cfg.cookieDomain
  });

  if (cfg.id) {
    this._id = this._idBackup(cfg.id);
  } else {
    this.sync();
    if (cfg.init !== false) {
      this.attach(cfg.syncMs || 2000);
    }
  }
}

/**
 * _idBackup wraps the user-given id, providing error reporting and a non-empty
 * fallback in-case it errors or provides an empty value.
 * @param {string|Promise<string>} id
 * @returns {Promise<string>}
 */
Core.prototype._idBackup = function(id) {
  var that = this;
  function backup() {
    that._id = null;
    that.sync();
    return that.id();
  }

  // We could have handled id the same way - whether string or Promise - if new
  // Promise(r => r(id)).then(sid => ...) always resolved to a string sid, but
  // the Yaku Promise implementation we bundle doesn't unwrap the Promise id
  // resolved in the constructor. So instead, we look for something then-able.
  if (!id.then) {
    return new this.Promise(function(r) { r(id); });
  }

  // Wrap the Promise id to ensure we never get an empty deviceId.
  return this.sniffError(function() {
    return id;
  }).then(
    function(id) {
      if (id) return id;
      return backup();
    },
    backup
  );
};

/**
 * id reads our device identity from the browser.
 * @fulfil {string} The device ID.
 * @returns {Promise<string>}
 */
Core.prototype.id = function() {
  if (this._id) {
    // Keep the IDs from last time.
    return this._id;
  }

  var c = this;
  this._id = this.sniffError(function() {
    return new c.Promise(function(resolve) {
      resolve(c.cookies.get(c.cookie) || 'rjs-' + uuid());
    });
  });
  return this._id;
};

/**
 * daysFromNow returns the current time, days in the future.
 * @param {number} days The number of days in the future.
 * @returns Date
 */
function daysFromNow(days) {
  return new Date(new Date().getTime() + days * 86400 * 1000);
}

/**
 * sync writes our ID into the various places we try to keep hold of it.
 */
Core.prototype.sync = function() {
  var c = this;
  var ttlDays = this.cookieExpiryDays;
  return this.id().then(function(id) {
    c.cookies.set({
      name: c.cookie,
      value: id,
      expires: daysFromNow(ttlDays)
    });
  });
};

/**
 * attach to the browser to maintain our ids somewhere.
 * @param {number} syncMs How often we attempt to re-synchronise.
 */
Core.prototype.attach = function(syncMs) {
  setInterval(bind(this.sync, this), syncMs);
};

/**
 * sameOrigin returns whether a url is treated as the same origin of the page
 * loaded into the browser.
 * @param {string} url
 * @returns {boolean}
 */
function sameOrigin(url) {
  var matches = url.match('(https?)?://([^/]+)');
  if (!matches) {
    // Relative paths must be the same origin.
    return true;
  }
  // Check the host:port matches.
  if (matches[2] != window.location.host) {
    return false;
  }
  // Check the scheme matches.
  if (matches[1] != "" && matches[1] != window.location.protocol.replace(/:/, '')) {
    return false;
  }
  return true;
}

var defaultAPI = 'https://live.ravelin.click';

/**
 * apiFromKey returns the likely API URL based on the key. Keys are arbitrary
 * strings, but we occassionally issue keys of the format
 * "publishable_key_[test_][env_][key]" to embed env.
 * @param {string} key
 * @returns {string} API URL
 */
function apiFromKey(key) {
  if (!key || key.substr(0, 16) != 'publishable_key_') {
    return defaultAPI;
  }

  var words = key.substr(16).split('_');
  if (words.length < 2) {
    return defaultAPI;
  }

  var env = words[words.length - 2];
  if (env == 'test' || env == 'live') {
    return defaultAPI;
  }

  return 'https://' + encodeURIComponent(env) + '.ravelin.click';
}

var _XDomainRequest = window.XDomainRequest;

/**
 * @typedef {Object} CoreResponse
 * @property {number} status
 * @property {string} text
 * @property {number} attempt
 */

/**
 * reportError sends an Error to Ravelin so that we can track what's happening.
 * @param {*} e
 * @returns {Promise<void>}
 */
Core.prototype.reportError = function(e) {
  var that = this;
  if (this._id) {
    return this.id().then(report);
  }
  return report();

  function report(id) {
    return that.send('POST', 'z/err', {
      deviceId: id,
      libVer: version,
      type: e.name,
      msg: e.message || e,
      error: e.stack
    }).then(function() {});
  }
};

/**
 * sniffError invokes fn and reports any errors back to Ravelin. If the return
 * value of fn is a Promise-like object then any rejection is also reported.
 */
Core.prototype.sniffError = function(fn) {
  var c = this;
  try {
    var p = fn();
    if (p && p.then) p.then(undefined, function(e) {
      c.reportError(e);
    });
    return p;
  } catch (e) {
    c.reportError(e);
    throw e;
  }
};

/**
 * bind returns a function that invokes fn.apply(thisArg, ...args) and reports
 * any errors using sniffError.
 *
 * @param {Function} fn
 * @param {*} [thisArg]
 * @param {...*} [args]
 * @returns {Function}
 */
Core.prototype.bind = function() {
  var c = this;
  var fn = bind.apply(null, Array.prototype.slice.call(arguments));
  return function() {
    var args = Array.prototype.slice.call(arguments);
    return c.sniffError(function() {
      return fn.apply(null, args);
    });
  };
};

/**
 * send makes a HTTP request and returns a Promise that resolves to the response
 * body or is rejected with any errors or non-2xx status codes.
 *
 * For backwards compatibility with IE8-9 whose XDomainRequest does not allow us
 * to add headers to cross-domain requests - and to avoid OPTIONS preflight
 * requests on browsers that do - we do not accept setting headers here. Instead
 * we put the key in the query string and expect the server to support whatever
 * headers the browser cares to add.
 *
 * @param {string} method
 * @param {string} path
 * @param {object} body
 * @returns {Promise<CoreResponse>}
 */
Core.prototype.send = function(method, path, body) {
  if (!this.key) {
    throw new Error('ravelin/core: no key set for API requests');
  }

  // Build the URL to run.
  var url = this.api + '/' + path.replace(/^\/+/, '');
  url += (url.indexOf('?') == -1 ? '?' : '&') + 'key=' + encodeURIComponent(this.key);
  url = url.replace(/^\/+/, '/');

  var c = this;
  return promiseRetry(c.Promise, function(retry, attempt) {
    return (
      // Make the request.
      !sameOrigin(url) && _XDomainRequest) ?
        c._sendXDR(method, url, stringify(body)) :
        c._sendXHR(method, url, stringify(body)
    ).then(function(r) {
      r.attempt = attempt;

      // Resolve/reject based on status.
      if (r.status == 1223) {
        r.status = 204; // IE0013 from http://www.enhanceie.com/ie/bugs.asp.
      }
      if (r.status >= 200 && r.status < 300) {
        return r;
      } else if (r.status == 400 && r.text == "") {
        // Retry empty 400s injected by the BrowserStack tunnel.
        retry(r);
      } else if (r.status >= 500) {
        // Retry errors.
        retry(r);
      }
      return new c.Promise(function(resolve, reject) {
        reject(r);
      });
    });
  }, 2, this.sendRetryMs);
};

/**
 * _sendXHR wraps an XHR in a Promise.
 *
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<CoreResponse>}
 */
Core.prototype._sendXHR = function(method, url, body) {
  return new this.Promise(function(resolve) {
    var r = new XMLHttpRequest();
    r.onreadystatechange = function() {
      if (r.readyState == 4) {
        resolve({status: r.status, text: r.responseText});
      }
    };

    // Send the request.
    r.open(method, url);
    r.send(body);
  });
};

/**
 * _sendXDR wraps an XHR in a Promise.
 *
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<CoreResponse>}
 */
Core.prototype._sendXDR = function(method, url, body) {
  return new this.Promise(function(resolve, reject) {
    var r = new _XDomainRequest();
    r.onload = function() {
      resolve({status: r.status || 200, text: r.responseText});
    };
    r.onerror = function() {
      reject({status: r.status, text: r.responseText});
    };
    r.onprogress = function() {
      // Needed to ensure onload fires.
    };

    r.open(method, url);
    setTimeout(function () {
      // Wrapped in a timeout to prevent an issue with the interface where some
      // requests are lost if multiple XDomainRequests are being sent at the
      // same time.
      // https://developer.mozilla.org/en-US/docs/Web/API/XDomainRequest.
      r.send(body);
    }, 0);
  });
};

/**
 * stringify is JSON.stringify with prototype safety.
 *
 * @param {object} obj
 * @returns {string}
 */
function stringify(obj) {
  if (Array.prototype.toJSON) {
    // https://stackoverflow.com/questions/710586/json-stringify-array-bizarreness-with-prototype-js
    var _array_tojson = Array.prototype.toJSON;
    delete Array.prototype.toJSON;
    var str = JSON.stringify(obj);
    /* jshint -W121 */// We're restoring a native extension.
    Array.prototype.toJSON = _array_tojson;
    /* jshint +W121 */
    return str;
  }
  return JSON.stringify(obj);
}

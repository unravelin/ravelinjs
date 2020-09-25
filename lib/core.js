import version from './version';
import { CookieJar } from './cookies';
import { bind } from './util';

/**
 * @typedef {object} Config
 * @prop {PromiseConstructor} [Promise=Promise]
 * @prop {string} [key] The API key ("publishable_key_..." or "pk_...") used to authenticate with the Ravelin API.
 * @prop {string} [api] A string of the format "https://api.ravelin.net" which forms the base of API requests.
 * @prop {boolean} [swallowErrors=!!window.onerror] Whether exceptions thrown by Ravelin's event handlers should be swallowed after being logged.
 * @prop {string} [cookieDomain] The domain on which to set cookies. Ignored if invalid.
 * @prop {number} [syncMS=2000] The sync timeout frequency.
 */

/**
 * Core library instance. Provides helpers and device identification.
 * @class
 * @param {Config} cfg
 */
export function Core(cfg) {
  this.Promise = cfg.Promise || window.Promise;

  // API connectivity. TODO Move to an API client?
  this.key = cfg.key;
  this.api = (cfg.api || apiFromKey(this.key)).replace(/\/+$/, '');

  // Device IDs.
  this.cookies = new CookieJar({
    domain: cfg.cookieDomain
  });
  this.sync();
  if (cfg.attach !== false) {
    this.attach(cfg.syncMS || 2000);
  }

  // Error-reporting.
  this.swallowErrors =
    typeof cfg.swallowErrors !== 'undefined' ? cfg.swallowErrors :
    typeof window !== 'undefined' ? !!window.onerror :
    true;
}

var deviceIdCookie = 'ravelinDeviceId';

/**
 * id reads our device identity from the browser.
 * @returns {Promise<string>}
 */
Core.prototype.id = function() {
  if (this._id) {
    // Keep the IDs from last time.
    return this._id;
  }

  var c = this.cookies;
  this._id = new this.Promise(function(resolve) {
    resolve(c.get(deviceIdCookie) || 'rjs-' + uuid());
  });
  return this._id;
};

var thirtheenMonthsFromNow = new Date(new Date().getTime() + 393 * 86400 * 1000);

/**
 * sync writes our ID into the various places we try to keep hold of it.
 */
Core.prototype.sync = function() {
  var c = this.cookies;
  this.id().then(function(id) {
    c.set({
      name: deviceIdCookie,
      value: id,
      expires: thirtheenMonthsFromNow
    });
  });
};

/**
 * attach to the browser to maintain our ids somewhere.
 * @param {number} syncMS How often we attempt to re-synchronise.
 */
Core.prototype.attach = function(syncMS) {
  setInterval(bind(this.sync, this), syncMS);
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

/**
 * @private
 */
var defaultAPI = 'https://ravelin.click';

/**
 * apiFromKey returns the likely API URL based on the key. Keys are arbitrary
 * strings, but we occassionally issue keys of the format
 * "publishable_key_[test_][env_][key]" to embed env.
 *
 * @private
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

/**
 * A lookup table used for uuid generation. Populated on first usage.
 * @type {string[]}
 * @private
 */
var _lut;

/**
 * uuid generates a fresh [UUID v4](https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_4_(random)).
 *
 * @returns {string}
 */
export function uuid() {
  var d0, d1, d2, d3;

  // try to use the newer, randomer crypto.getRandomValues if available
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues && typeof Int32Array !== 'undefined') {
    var d = new Int32Array(4);
    window.crypto.getRandomValues(d);
    d0 = d[0];
    d1 = d[1];
    d2 = d[2];
    d3 = d[3];
  } else {
    // Generate a random float between 0-1, multiple by 4294967295 (0xffffffff)
    // then round down via bitwise or (|0) so we are left with a random 32bit
    // number. These 4 values are then bitshifted around to produce additional
    // random values.
    d0 = Math.random()*0xffffffff|0;
    d1 = Math.random()*0xffffffff|0;
    d2 = Math.random()*0xffffffff|0;
    d3 = Math.random()*0xffffffff|0;
  }

  // Populate our lookup table (_lut) sequentially with hexidecimal strings
  // starting from 00 all the way through to ff, covering the entire 256 hex
  // range.
  if (!_lut) {
    _lut = [];
    for (var i = 0; i < 256; i++) {
      _lut[i] = (i < 16 ? '0' : '') + (i).toString(16);
    }
  }

  // From our 4 random 32 bit values, we take the first 8 bits via bitwise AND
  // against 255 (&0xff), then the next 8 bits via bitwise shift right (>>8) and
  // repeat that 4 times through to get 4 random, 8 bit numbers, which are used
  // to look up the sequentially generated hex characters in our lookup table.
  // There are two interesting numbers here though:
  //
  // - the 15th character will always be a 4, because we bitwise AND against 15
  //   rather than 255 and we bitwise OR against 64 (0x40), producing values in
  //   the range of 64-79, which is the 16 hex values prefixed with a 4 (40
  //   through to 4f)
  //
  // - the 20th character will always be one of 8, 9, a or b because we bitwise
  //   AND against 63 and bitwise OR against 128, producing values in the range
  //   of 128-191, which is the 64 hex values ranging from 80 through to bf
  //
  // This logic almost mirrors the specification of v4 RFC 4122 UUIDs, but omits
  // the `clock_seq_hi_and_reserved` requirement
  // https://tools.ietf.org/html/rfc4122.
  //
  // The result are identifiers of 36 characters, 34 of which are randomly
  // assigned.
  return _lut[d0&0xff]+_lut[d0>>8&0xff]+_lut[d0>>16&0xff]+_lut[d0>>24&0xff]+'-'+
    _lut[d1&0xff]+_lut[d1>>8&0xff]+'-'+_lut[d1>>16&0x0f|0x40]+_lut[d1>>24&0xff]+'-'+
    _lut[d2&0x3f|0x80]+_lut[d2>>8&0xff]+'-'+_lut[d2>>16&0xff]+_lut[d2>>24&0xff]+
    _lut[d3&0xff]+_lut[d3>>8&0xff]+_lut[d3>>16&0xff]+_lut[d3>>24&0xff];
}

var _XDomainRequest = window.XDomainRequest;

/**
 * @typedef {Object} CoreResponse
 * @property {number} status
 * @property {string} text
 */

/**
 * reportError sends an Error to Ravelin so that we can track what's happening.
 * @param {*} e
 * @returns {Promise<void>}
 */
Core.prototype.reportError = function(e) {
  var that = this;
  return this.id().then(function(id) {
    return that.send('POST', 'z/err', {
      deviceId: id,
      libVer: version,
      type: e.name,
      msg: e.message || e,
      error: e.stack
    }).then(function() {});
  });
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

  var P = this.Promise;

  // Build the URL to run.
  var url = this.api + '/' + path.replace(/^\/+/, '');
  url += (url.indexOf('?') == -1 ? '?' : '&') + 'key=' + encodeURIComponent(this.key);

  return (
    // Make the request.
    (!sameOrigin(url) && _XDomainRequest) ?
      this._sendXDR(method, url, stringify(body)) :
      this._sendXHR(method, url, stringify(body))
  ).then(function(r) {
    // Resolve/reject based on status.
    if (r.status == 1223) {
      r.status = 204; // IE0013 from http://www.enhanceie.com/ie/bugs.asp.
    }
    if (r.status >= 200 && r.status < 300) {
      return r;
    }
    return new P(function(resolve, reject) {
      reject(r);
    });
  });
};

/**
 * _sendXHR wraps an XHR in a Promise.
 * @param {string} method
 * @param {string} url
 * @param {object} body
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

/**
 * @private
 * @module ravelinjs/cookies
 */

/**
 * CookieJar provides getters/setters for cookies.
 * @class
 * @private
 * @param {object} cfg The cookiejar configuration.
 * @param {string} [cfg.domain] The domain on which to store cookies.
 */
export function CookieJar(cfg) {
  this.domain = cfg.domain;
}

/**
 * get returns the value of the cookie of the given name, or undefined.
 * @param {string} name
 * @returns {string|undefined}
 */
CookieJar.prototype.get = function(name) {
  var cookies = document.cookie.split('; ');
  for (var i = cookies.length-1; i >= 0; i--) {
    var x = cookies[i].split("=");
    if (x[0] === name) {
      return x[1];
    }
  }
  return undefined;
};

/**
 * set a cookie on the given domain.
 * @param {object} c The cookie to set.
 * @param {string} c.name The name of the cookie.
 * @param {string} c.value The value to be stored in the cookie.
 * @param {string} [c.path="/"] The path to store the cookie under.
 * @param {Date} [c.expires] The expiry time of the cookie. If not set, the cookie implicitly becomes a session cookie.
 */
CookieJar.prototype.set = function(c) {
  var cook = c.name + "=" + c.value + ";path=" + (c.path || "/") +
    (c.expires ? ";expires=" + c.expires.toUTCString() : "") +
    (this.domain ? ";domain=" + this.domain : "");

  if (typeof(this.samesite) === 'undefined') {
    // Determine the correct value for SameSite.
    if (hasWebKitSameSiteBug(window.navigator.userAgent)) {
      this.samesite = '';
    } else if (window.location.protocol == 'https:') {
      this.samesite = ';SameSite=None;Secure';
    } else {
      this.samesite = ';SameSite=Lax';
    }

    // Try this samesite value.
    document.cookie = cook + this.samesite;
    if (this.get(c.name) == c.value) {
      // We set the cookie successfully.
      return;
    }
    // The cookie was discarded - avoid using samesite.
    this.samesite = '';
  }

  document.cookie = cook + this.samesite;
};

/**
 * hasWebKitSameSiteBug indicates whether a given User-Agent treats
 * SameSite:None on cookies as if it were SameSite:Strict, which is very
 * different. Adapted from the procedure on
 * https://www.chromium.org/updates/same-site/incompatible-clients.
 *
 * @param ua string
 * @returns bool
 */
function hasWebKitSameSiteBug(ua) {
  if (/\(iP.+; CPU .*OS 12[_\d]*.*\) AppleWebKit\//.test(ua)) {
    return true;
  }
  if (/\(Macintosh;.*Mac OS X 10_14[_\d]*.*\) AppleWebKit\//.test(ua)) {
    if (/^Mozilla\/[\.\d]+ \(Macintosh;.*Mac OS X [_\d]+\) AppleWebKit\/[\.\d]+ \(KHTML, like Gecko\)$/.test(ua)) {
      return true;
    }
    if (/Version\/.* Safari\//.test(ua) && !/Chrom(e|ium)/.test(ua)) {
      return true;
    }
  }
  return false;
}

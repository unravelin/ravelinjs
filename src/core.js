var FULL_VERSION_STRING = require('./version');

// URLs
var API_URL = 'https://api.ravelin.net';
var FINGERPRINT_URL = API_URL + '/v2/fingerprint?source=browser';
var CLICKSTREAM_URL = API_URL + '/v2/click';

// Cookies
var DEVICEID_STORAGE_NAME = 'ravelinDeviceId';
var SESSIONID_COOKIE_NAME = 'ravelinSessionId';
var COOKIE_NAMES = [DEVICEID_STORAGE_NAME, SESSIONID_COOKIE_NAME];

// Event types
var GENERIC_TRACK_EVENT_TYPE = 'track';
var RESIZE_EVENT_TYPE = 'resize';
var PASTE_EVENT_TYPE = 'paste';

// Event names
var UNKNOWN_EVENT_NAME = 'UNNAMED';
var PAGE_EVENT_NAME = 'PAGE_LOADED';
var LOGIN_EVENT_NAME = 'LOGIN';
var LOGOUT_EVENT_NAME = 'LOGOUT';

// Misc
var THIRTEEN_MONTHS = 339552e5; // 393 days as ms (393 * 86400 * 1000)

/**
 * Default constructor for a ravelinjs instance. Not exported. Instead, it is invoked during script loading
 * and the resulting instance is exported. Initialises uuids and lookup table.
 */
function RavelinJS() {
  // Seed our UUID lookup table
  this.lut = [];

  for (var i = 0; i < 256; i++) {
    this.lut[i] = (i < 16 ? '0' : '') + (i).toString(16);
  }

  // Initialise our ids
  this.setDeviceId();
  this.setSessionId();
  this.windowId = this.uuid();
}

/**
 * setPublicAPIKey sets the API Key used to authenticate with Ravelin. It should be called
 * before anything else. You can find your publishable API key inside the Ravelin dashboard.
 *
 * @param {String} apiKey Your publishable API key
 * @example
 * ravelinjs.setPublicAPIKey('live_publishable_key_abc123');
 */
RavelinJS.prototype.setPublicAPIKey = function(pubKey) {
  this.apiKey = pubKey;
};

/**
 * setCustomerId sets the customerId for all requests submitted by ravelinjs. This is needed to associate device activity
 * with a specific user. This value should be the same that you are providing to Ravelin in your server-side
 * API requests. If this value is not yet know, perhaps because the customer has not yet logged in or provided
 * any user details, please refer to setTempCustomerId instead.
 *
 * @param {String} customerId customerId unique to the current user
 * @example
 * ravelinjs.setCustomerId('123321');
 */
RavelinJS.prototype.setCustomerId = function(custId) {
  if (!custId) {
    return;
  }

  if (typeof custId === 'string' && custId.indexOf('@') != -1) {
    custId = custId.toLowerCase();
  }

  this.customerId = '' + custId;
};

/**
 * setTempCustomerId sets the tempCustomerId for all requests submitted by ravelinjs. This is used as a temporary association between device/
 * session data and a user, and should be followed with a v2/login request to Ravelin as soon as a
 * customerId is available.
 *
 * @param {String} tempCustomerId A placeholder id for when customerId is not known
 * @example
 * ravelinjs.setTempCustomerId('session_abcdef1234567'); // a session id is often a good temporary customerId
 */
RavelinJS.prototype.setTempCustomerId = function(tempCustId) {
  if (!tempCustId) {
    return;
  }

  if (typeof tempCustId === 'string' && tempCustId.indexOf('@') != -1) {
    tempCustId = tempCustId.toLowerCase();
  }

  this.tempCustomerId = '' + tempCustId;
};

/**
 * trackFingerprint sends device information back to Ravelin. Invoke from
 * the checkout page of your payment flow.
 *
 * @param {String} customerId The customerId to set for this device fingerprint. Optional if setCustomerId called in advance.
 * @param {Function} callback Optional callback function to execute upon completion, passing an error if one occurred.
 * @example
 * // if setCustomerId was already called
 * ravelinjs.trackFingerprint();
 * // else, you must inform Ravelin of the customerId explicitly
 * ravelinjs.trackFingerprint('customer123');
 */
RavelinJS.prototype.trackFingerprint = function(custId, cb) {
  if (custId) {
    this.setCustomerId(custId);
  }

  // Construct the outer most payload for a fingerprint request, containing our entity Ids
  var payload = outerPayload(this.customerId, this.tempCustomerId, this.orderId, this.deviceId);
  payload.fingerprintSource = 'browser';

  // browserData represents our inner payload, containing the fingerprint specific information.
  var browserData = deviceInfo();

  // The sessionId is included on this inner obj, rather than on the outermost level.
  browserData.sessionId =  this.sessionId;

  if (typeof location !== 'undefined') {
    browserData.url = location.href;
  }

  payload.browser = browserData;

  sendToRavelin(this.apiKey, FINGERPRINT_URL, payload, cb);
};

/**
 * getDeviceInfo returns basic device information to aid in construction of 3DS2 AReqs.
 *
 * @example
 * var deviceInfo = ravelinjs.getDeviceInfo();
 */
RavelinJS.prototype.getDeviceInfo = function() {
  return deviceInfo();
};

/**
 * track invokes the Ravelin client-side tracking script. You must have set
 * the public API key in advance of calling track, so that it can submit the
 * data directly to Ravelin. Its execution is asynchronous.
 *
 * @param {String} eventName A description of what has occurred.
 * @param {Object} meta Any additional metadata you wish to use to describe the page.
 * @param {Function} callback Optional callback function to execute upon completion, passing an error if one occurred.
 * @example
 * // track when a customer uses search functionality
 * ravelinjs.track('CUSTOMER_SEARCHED', { searchType: 'product' });
 *
 * // track without any additional metadata
 * ravelinjs.track('CUSTOMER_SEARCHED');
 */
RavelinJS.prototype.track = function(eventName, eventProperties, cb) {
  var payload = outerPayload(this.customerId, this.tempCustomerId, this.orderId);
  var trackingPayload = trackPayload(payload, this.deviceId, this.sessionId, eventName, eventProperties);

  sendToRavelin(this.apiKey, CLICKSTREAM_URL, trackingPayload, cb);
};

/**
 * trackPage logs the page view. Call this from as many pages as possible.
 *
 * @param {Object} meta Any additional metadata you wish to use to describe the page.
 * @param {Function} callback Optional callback function to execute upon completion, passing an error if one occurred.
 * @example
 * // Call from landing page after page load
 * ravelinjs.trackPage(); // www.ravelintest.com
 *
 * // Identical calls should be made on all subsequent page loads
 * ravelinjs.trackPage(); // www.ravelintest.com/page-1
 * ...
 * ravelinjs.trackPage(); // www.ravelintest.com/page-2
 * ...
 * ...
 * ravelinjs.trackPage(); // www.ravelintest.com/page-3
 * ..
 * ravelinjs.trackPage(); // www.ravelintest.com/page-2
 */
RavelinJS.prototype.trackPage = function(eventProperties, cb) {
  this.track(PAGE_EVENT_NAME, eventProperties, cb);
};

/**
 * trackLogin informs Ravelin of customers logging into your site.
 *
 * @param {String} customerId The customerId to set for this device fingerprint. Optional if setCustomerId called in advance.
 * @param {Object} meta Any additional metadata you wish to use to describe the event.
 * @param {Function} callback Optional callback function to execute upon completion, passing an error if one occurred.
 * @example
 * ravelinjs.trackLogin('cust123', {...}); // Called immediately after your login logic.
 */
RavelinJS.prototype.trackLogin = function(customerId, eventProperties, cb) {
  if (customerId) {
    this.setCustomerId(customerId);
  }

  this.track(LOGIN_EVENT_NAME, eventProperties, cb);
};

/**
 * trackLogout informs Ravelin of logout events and resets the associated customerId and tempCustomerId.
 * Call this function immediately before your own logout logic is executed.
 *
 * @param {Object} meta Any additional metadata you wish to use to describe the event.
 * @param {Function} callback Optional callback function to execute upon completion, passing an error if one occurred.
 * @example
 * ravelinjs.trackLogout(); // Called before you begin your logout process
 */
RavelinJS.prototype.trackLogout = function(eventProperties, cb) {
  this.track(LOGOUT_EVENT_NAME, eventProperties, cb);
  this.customerId = undefined;
  this.tempCustomerId = undefined;
  this.orderId = undefined;
};

/**
 * setCookieDomain configures where Ravelin will store any cookies on your
 * domain. Set as high as possible, e.g. ".mysite.com" rather than
 * ".www.uk.mysite.com".
 *
 * @param {String} domain Domain under which Ravelin generated cookies should be stored
 * @example
 * ravelinjs.setCookieDomain('.mysite.com');
 */
RavelinJS.prototype.setCookieDomain = function(domain) {
  // Clear all cookies set to the current cookie domain.
  // We can still get device/sessionIds from our proto variables.
  cleanCookies(this.cookieDomain);

  this.cookieDomain = domain;

  var expiry = new Date(new Date().getTime() + THIRTEEN_MONTHS);

  // Maintain the same device/sessionIds, but store them now under the new domain
  writeCookie(DEVICEID_STORAGE_NAME, this.deviceId, expiry, null, this.cookieDomain);
  writeCookie(SESSIONID_COOKIE_NAME, this.sessionId, null, null, this.cookieDomain);
};

/**
 * Set the orderId submitted with requests. This is used to associate session-activity
 * with a specific user.
 *
 * @param {String} orderId Current orderId for the order
 * @example
 * ravelinjs.setOrderId('order123');
 */
RavelinJS.prototype.setOrderId = function(orderId) {
  if (!orderId) {
    return;
  }

  this.orderId = '' + orderId;
};

/**
 * Return the deviceId currently assigned by ravelinjs
 *
 * @example
 * var deviceId = ravelinjs.getDeviceId();
 */
RavelinJS.prototype.getDeviceId = function() {
  return this.deviceId;
};

/**
 * Allows the manual setting of a deviceId for scenarios in which you believe the value may have been reset.
 * Does not accept a deviceId parameter, instead it uses any existing deviceId set inside the device
 * cookies, or otherwise generates and assigns a new deviceId.
 *
 * @example
 * ravelinjs.setDeviceId();
 */
RavelinJS.prototype.setDeviceId = function() {
  var storedDeviceId = readCookie(DEVICEID_STORAGE_NAME);

  if (storedDeviceId) {
    // If deviceId is present in cookies, ensure it is also assigned to our instance
    this.deviceId = storedDeviceId;
    return;
  }

  var expiry = new Date(new Date().getTime() + THIRTEEN_MONTHS);
  if (this.deviceId) {
    // If deviceId is present in instance but not cookies, ensure it is also assigned to our cookies
    writeCookie(DEVICEID_STORAGE_NAME, this.deviceId, expiry, null);
    return;
  }

  // If no deviceId located, instantiate one and write to cookies
  this.deviceId = 'rjs-' + this.uuid();
  writeCookie(DEVICEID_STORAGE_NAME, this.deviceId, expiry, null);
};

/**
 * Return the sessionId currently assigned by ravelinjs
 *
 * @example
 * var sessionId = ravelinjs.getSessionId();
 */
RavelinJS.prototype.getSessionId = function() {
  return this.sessionId;
};

/**
 * Allows the manual setting of a sessionId for scenarios in which you believe the value may have been reset.
 * Does not accept a sessionId parameter, instead it uses any existing sessionId set inside the device
 * cookies, or otherwise generates and assigns a new sessionId.
 *
 * @example
 * ravelinjs.setSessionId();
 */
RavelinJS.prototype.setSessionId = function() {
  var storedSessionId = readCookie(SESSIONID_COOKIE_NAME);

  // There is a chance the lib was reloaded during the session. If so, assume the session is still valid
  if (storedSessionId) {
    this.sessionId = storedSessionId;
    return;
  }

  this.sessionId = this.uuid();

  // Set session with zero expiry, meaning the sessionId cookie will expire on browser exit
  writeCookie(SESSIONID_COOKIE_NAME, this.sessionId, 0, null);
};

/**
 * Returns the customerId currently assigned to ravelinjs
 *
 * @example
 * var customerId = ravelinjs.getCustomerId();
 */
RavelinJS.prototype.getCustomerId = function() {
  return this.customerId;
};

/**
 * Returns the orderId currently assigned to ravelinjs
 *
 * @example
 * var orderId = ravelinjs.getOrderId();
 */
RavelinJS.prototype.getOrderId = function() {
  return this.orderId;
};

/**
 * Returns the temporary customerId currently assigned to ravelinjs
 *
 * @example
 * var tempCustId = ravelinjs.getTempCustomerId();
 */
RavelinJS.prototype.getTempCustomerId = function() {
  return this.tempCustomerId;
};

/**
 * Univerally unique identifier generation, used internally by ravelinjs to set device/session ids.
 *
 * @example
 * var id = ravelinjs.uuid();
 */
RavelinJS.prototype.uuid = function() {
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
    // Generate a random float between 0-1, multiple by 4294967295 (0xffffffff) then round down via
    // bitwise or (|0) so we are left with a random 32bit number. These 4 values are then bitshifted
    // around to produce additional random values.
    d0 = Math.random()*0xffffffff|0;
    d1 = Math.random()*0xffffffff|0;
    d2 = Math.random()*0xffffffff|0;
    d3 = Math.random()*0xffffffff|0;
  }

  // Earlier, when we instantiated the lib, we prepopulated our lookup table (this.lut) sequentially with
  // hexidecimal strings starting from 00 all the way through to ff, covering the entire 256 hex range.

  // From our 4 random 32 bit values, we take the first 8 bits via bitwise AND against 255 (&0xff),
  // then the next 8 bits via bitwise shift right (>>8) and repeat that 4 times through to get 4 random,
  // 8 bit numbers, which are used to look up the sequentially generated hex characters in our lookup table.
  // There are two interesting numbers here though:
  //
  // - the 15th character will always be a 4, because we bitwise AND against 15 rather than 255
  //   and we bitwise OR against 64 (0x40), producing values in the range of 64-79, which is the 16 hex
  //   values prefixed with a 4 (40 through to 4f)
  //
  // - the 20th character will always be one of 8, 9, a or b because we bitwise AND against 63 and
  //   bitwise OR against 128, producing values in the range of 128-191, which is the 64 hex values ranging
  //   from 80 through to bf
  //
  // This logic almost mirrors the specification of v4 RFC 4122 UUIDs, but omits the `clock_seq_hi_and_reserved`
  // requirement https://tools.ietf.org/html/rfc4122.
  //
  // The result are identifiers of 36 characters, 34 of which are randomly assigned.

  return this.lut[d0&0xff]+this.lut[d0>>8&0xff]+this.lut[d0>>16&0xff]+this.lut[d0>>24&0xff]+'-'+
    this.lut[d1&0xff]+this.lut[d1>>8&0xff]+'-'+this.lut[d1>>16&0x0f|0x40]+this.lut[d1>>24&0xff]+'-'+
    this.lut[d2&0x3f|0x80]+this.lut[d2>>8&0xff]+'-'+this.lut[d2>>16&0xff]+this.lut[d2>>24&0xff]+
    this.lut[d3&0xff]+this.lut[d3>>8&0xff]+this.lut[d3>>16&0xff]+this.lut[d3>>24&0xff];
};

// ========================================================================================================
//
// private functions
//

function deviceInfo() {
  var info = {
    browser: getBrowser(),
    javascriptEnabled: true,
    timezoneOffset: new Date().getTimezoneOffset(),
  };

  if (typeof navigator !== 'undefined') {
    var language = navigator.language ||
                   navigator.userLanguage ||
                   navigator.browserLanguage ||
                   navigator.systemLanguage;

    info.language = language;
    info.userAgent = navigator.userAgent;
    info.javaEnabled = navigator.javaEnabled();
  }

  if (typeof window !== 'undefined') {
    info.colorDepth = window.screen.colorDepth;
    info.screenHeight = window.screen.height;
    info.screenWidth = window.screen.width;
  }

  return info;
}

function getBrowser() {
  if (typeof navigator === 'undefined') {
    return 'Unknown';
  }

  // Extract the browser from the user agent (respect the order of the tests)
  var browser;
  var userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.indexOf('firefox') >= 0) {
    browser = 'Firefox';
  } else if (userAgent.indexOf('opera') >= 0 || userAgent.indexOf('opr') >= 0) {
    browser = 'Opera';
  } else if (userAgent.indexOf('chrome') >= 0) {
    browser = 'Chrome';
  } else if (userAgent.indexOf('safari') >= 0) {
    browser = 'Safari';
  } else if (userAgent.indexOf('trident') >= 0) {
    browser = 'Internet Explorer';
  } else {
    browser = 'Other';
  }

  return browser;
}

// outerPayload represents the outermost levels for our API payloads, always containing libVer,
// and customer/order entity ids. The deviceId may be included at this level as well,
// (as is the case for fingerprint requests), or it may be included at a lower level (clickstream events).
function outerPayload(custId, tempCustId, orderId, deviceId) {
  var payload = { libVer: FULL_VERSION_STRING };

  if (custId) {
    payload.customerId = custId;
  }

  if (tempCustId) {
    payload.tempCustomerId = tempCustId;
  }

  if (orderId) {
    payload.orderId = orderId;
  }

  if (deviceId) {
    payload.deviceId = deviceId;
  }

  return payload;
}

function trackPayload(outerPayload, deviceId, sessionId, eventName, eventProperties) {
  // We have some predetermined event types that correspond to known event names, match them up first,
  // falling back to simply 'track' if this has a custom (aka unknown) event name.
  var eventType = '';
  if (eventName === RESIZE_EVENT_TYPE) {
    eventType = RESIZE_EVENT_TYPE;
  } else if (eventName === PASTE_EVENT_TYPE) {
    eventType = PASTE_EVENT_TYPE;
  } else {
    eventType = GENERIC_TRACK_EVENT_TYPE;
  }

  // If the client fails to specify an eventName when calling the custom track function, use 'UNNAMED'
  if (!eventName || typeof eventName !== 'string') {
    eventName = UNKNOWN_EVENT_NAME;
  }

  // If the client fails to include custom event properties for this event, we still send a null value
  if (eventProperties && typeof eventProperties !== 'object') {
    eventProperties = null;
  }

  // We include the timestamp of when we constructed this event, incl microsecond timings rounded to the
  // nearest 5us for browsers which support microsecond timestamps.
  var now = Date.now ? Date.now() : +new Date();
  var nowMicro = 0;
  if (typeof performance !== 'undefined' && performance.now && performance.timing) {
    nowMicro = (performance.timing.navigationStart + performance.now())*1000 || 0;
  }

  // Construct our full event payload, appending tracking information
  outerPayload.eventType = eventType;
  outerPayload.eventData = {
    eventName: eventName,
    properties: eventProperties
  };

  outerPayload.eventMeta = {
    trackingSource: 'browser',
    ravelinDeviceId: deviceId,
    ravelinSessionId: sessionId,
    clientEventTimeMilliseconds: now,
    clientEventTimeMicroseconds: nowMicro
  };

  // Enrich eventMeta with additional data from browser
  if (typeof window !== 'undefined' && window.location) {
    outerPayload.eventMeta.url = window.location.href;
  }

  if (typeof document !== 'undefined') {
    outerPayload.eventMeta.canonicalUrl = getCanonicalUrl();
    outerPayload.eventMeta.pageTitle = document.title;
    outerPayload.eventMeta.referrer = document.referrer || undefined;
  }

  // We wrap our payload in another obj, sending our single event as the first element of an array of events
  return { events: [outerPayload] };
}

function getCanonicalUrl() {
  var element;

  if (document.querySelector) {
    element = document.querySelector("link[rel='canonical']");
  } else {
    var links = document.getElementsByTagName('link');
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('rel') === 'canonical') {
        element = links[i];
        break;
      }
    }
  }

  return element ? element.href : undefined;
}

function cleanCookies(domain) {
  var expired = new Date(0);
  for (var i = 0; i < COOKIE_NAMES.length; i++) {
    writeCookie(COOKIE_NAMES[i], '', expired, null, domain);
  }
}

function readCookie(cookieName) {
  if (typeof document === 'undefined' || typeof document.cookie === 'undefined') {
    return;
  }

  var cookies = document.cookie.split('; ');
  for (var i = cookies.length-1; i >= 0; i--) {
    var x = cookies[i].split('=');
    if (x[0] === cookieName) {
      return x[1];
    }
  }
}

function writeCookie(name, value, expires, path, domain) {
  if (typeof document === 'undefined' || typeof document.cookie === 'undefined') {
    return;
  }

  document.cookie = name + '=' + value + ';path=' + (path || '/') +
    (expires ? ';expires=' + expires.toUTCString() : '') +
    (domain ? ';domain=' + domain : '');
}

function detectPAN(str) {
  var regex = /\b(?:\d[ -]*){12,16}\d\b/g;
  return regex.test(str);
}

function obfsPasteData(str) {
  str = str.replace(/[0-9]/g, '0');
  return str.replace(/[A-Za-z]/g, 'X');
}

function sendToRavelin(apiKey, url, payload, cb) {
  if (!apiKey) {
    var err = new Error('[ravelinjs] "apiKey" is null or undefined');
    if (!cb) {
      throw err;
    } else {
      handleCallback(cb, err);
    }
  }

  if (typeof payload === 'object') {
    payload = JSON.stringify(payload);
  }

  var xhr = new XMLHttpRequest();

  if ('withCredentials' in xhr) {
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.setRequestHeader('Authorization', 'token ' + apiKey);
    xhr.send(payload);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300 && cb) {
          handleCallback(cb);
        } else if (xhr.status > 400 && cb) {
          handleCallback(cb, new Error('[ravelinjs] Error occurred sending payload to '
            + url + '. ' + xhr.responseText));
        }
      }
    };
  };
}

// handleCallback ensures we don't try and call unspecified callbacks, and that we only pass through
// instances of error values (if they are present). We don't want to pass other alues through because it
// limits our ability to change the structure of those values in future versions.
function handleCallback(cb, err) {
  if (!cb || typeof cb !== 'function') {
    return;
  }

  if (err && err instanceof Error) {
    cb(err);
  } else {
    cb();
  }
}

module.exports = RavelinJS;

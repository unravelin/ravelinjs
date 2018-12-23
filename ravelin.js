// Universal Module Definition: https://github.com/umdjs/umd/blob/36fd1135ba44e758c7371e7af72295acdebce010/templates/returnExports.js#L40-L60
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ravelinjs = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Versioning
  var RAVELINJS_VERSION = '1.0.0';
  var FULL_VERSION_STRING = RAVELINJS_VERSION + '-ravelinjs';

  // URLs
  var API_URL = 'https://api.ravelin.com';
  var FINGERPRINT_URL = API_URL + '/v2/fingerprint?source=browser';
  var FINGERPRINT_ERROR_URL = API_URL + '/v2/fingerprinterror?source=browser';
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
  var NO_EXPIRE = new Date((new Date()).setDate(10000));

  /**
   * Default constructor for a ravelinjs instance. Not exported. Instead, it is invoked during script loading
   * and the resulting instance is exported. Initialises uuids and lookup-table.
   */
  function RavelinJS() {
    // Seed our UUID lookup table
    this.lut = [];

    for (var i=0; i<256; i++) {
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
  }

  /**
   * setRSAKey configures RavelinJS with the given public encryption key, in the format that
   * Ravelin provides it. You can find your public RSA key inside the Ravelin dashboard.
   *
   * @param {String} rawPubKey The public RSA key provided by Ravelin, used to encrypt card details.
   * @example
   * ravelinjs.setRSAKey('10010|abc123...xyz789');
   */
  RavelinJS.prototype.setRSAKey = function(rawPubKey) {
    if (typeof rawPubKey !== 'string') {
      throw new Error('[ravelinjs] Invalid value provided to RavelinJS.setRSAKey');
    }

    var split = rawPubKey.split('|');
    if (split.length < 2 || split.length > 3) {
      throw new Error('[ravelinjs] Invalid value provided to RavelinJS.setRSAKey');
    }

    this.rsaKey = new RSAKey();

    // A client's public RSA key has a structure of either 'exponent|modulus' or 'keyIndex|exponent|modulus'.
    // The index of a key is roughly equivalent to the version, with each new RSA key pair we
    // generate for a client having an index of n+1. A single client can have multiple active RSA key pairs,
    // and we can decomission a key pair as required while allowing all other active versions to operate.
    //
    // The first key we issue a client is of index 0. For keys of index 0, we omit this value from the key.
    // e.g '10001|AA1C1C1EC...`
    //
    // For all keys beyond the first, the index is prefixed to key definition.
    // e.g '1|10001|BB2D2D2FD...'
    //
    // For all keys (including those of index 0), the index must be returned from 'encrypt' calls;
    // the value is needed server-side to determine which private key should be used for decryption.
    if (split.length === 2) {
      this.keyIndex = 0;
      this.rsaKey.setPublic(split[1], split[0]);
    } else {
      this.keyIndex = +split[0];
      this.rsaKey.setPublic(split[2], split[1]);
    }
  }

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
  }

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
  }

  /**
   * encrypt performs the encrypt process for the provided card details and prepares them to be sent
   * to Ravelin, with the resulting payload returned as a string.
   *
   * @param {Object} details An object containing properties pan, month, year and nameOnCard (optional).
   * @return {String} The encrypted payload to be sent to Ravelin.
   * @example
   * var encrypted = ravelinjs.encrypt({pan: "4111 1111 1111 1111", month: 1, year: 18});
   * console.log(encrypted);
   * > '{"methodType":"paymentMethodCipher","cardCiphertext":"abc.....xyz==","aesKeyCiphertext":"def....tuv==","algorithm":"RSA_WITH_AES_256_GCM","ravelinSDKVersion": "0.0.1-ravelinjs"}'
   */
  RavelinJS.prototype.encrypt = function(details) {
    return JSON.stringify(this.encryptAsObject(details));
  }

  /**
   * encryptAsObject performs the encrypt process for the provided card details and prepares them to be sent
   * to Ravelin, with the resulting payload returned as an object.
   *
   * @param {Object} details An object containing properties pan, month, year and nameOnCard (optional).
   * @return {Object} The encrypted payload to be sent to Ravelin.
   * @example
   * var encrypted = ravelinjs.encryptAsObject({pan: "4111 1111 1111 1111", month: 1, year: 18});
   * console.log(encrypted);
   * > {
   * >  methodType: "paymentMethodCipher",
   * >  cardCiphertext: "abc.....xyz==",
   * >  aesKeyCiphertext: "def....tuv==",
   * >  algorithm: "RSA_WITH_AES_256_GCM",
   * >  ravelinSDKVersion: "0.0.1-ravelinjs",
   * > }
   */
  RavelinJS.prototype.encryptAsObject = function(details) {
    if (!this.rsaKey) {
      throw new Error('[ravelinjs] Encryption Key has not been set');
    }

    if (!details) {
      throw new Error('[ravelinjs] Encryption validation: no details provided');
    }

    if (details.pan) {
      details.pan = details.pan.toString().replace(/[^0-9]/g, '');
    }
    if (!details.pan || details.pan.length < 13) {
      throw new Error('[ravelinjs] Encryption validation: pan should have at least 13 digits');
    }

    // We accept the month as an int or string, specified as one or two digits.
    // We error if an invalid month is specified.
    if (typeof details.month == 'string') {
      details.month = parseInt(details.month, 10);
    }
    // Months in Javascript start at zero ;)
    if (!(details.month > 0 && details.month < 13)) {
      throw new Error('[ravelinjs] Encryption validation: month should be in the range 1-12');
    }

    // We accept year as an int or string, specified as either 2 digits (18) or 4 digits (2018).
    // We standardise the input to be 4 digits, erroring if after standardisation the 4 digit
    // year is not in the 21st century.
    if (typeof details.year === 'string') {
      details.year = parseInt(details.year, 10);
    }
    if (details.year > 0 && details.year < 100) {
      details.year += 2000;
    }
    if (!(details.year > 2000)) {
      throw new Error('[ravelinjs] Encryption validation: year should be in the 21st century');
    }

    for (var prop in details) {
      if (!details.hasOwnProperty(prop)) continue;
      switch (prop) {
        case 'pan':
        case 'year':
        case 'month':
        case 'nameOnCard':
          continue;
      }
      throw new Error('[ravelinjs] Encryption validation: encrypt only allows properties pan, year, month, nameOnCard');
    }

    details.month += '';
    details.year += '';

    // AES encrypt the card details, using a freshly generated session key and IV.
    // This key and IV are returned from this call as well, all as base64.
    var aesResult = aesEncrypt(JSON.stringify(details));

    // RSA encrypt the key and IV from the previous step, as a single pipe-delimited string.
    // The GCM auth tag is appended to the ciphertext.
    var rsaResultB64 = rsaEncrypt(this.rsaKey, aesResult.aesKeyB64, aesResult.ivB64);

    // This payload identically matches the structure we expect to be sent to the Ravelin API
    return {
      methodType: 'paymentMethodCipher',
      cardCiphertext: aesResult.ciphertextB64,
      aesKeyCiphertext: rsaResultB64,
      algorithm: 'RSA_WITH_AES_256_GCM',
      ravelinSDKVersion: FULL_VERSION_STRING,
      keyIndex: this.keyIndex
    };
  }

  /**
   * trackFingerprint sends device information back to Ravelin. Invoke from
   * the checkout page of your payment flow.
   *
   * @param {String} customerId The customerId to set for this device fingerprint. Optional if setCustomerId called in advance.
   * @param {Function} callback Optional callback function to execute upon completion, passing an error if one occured.
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
    // The sessionId is included on this inner obj, rather than on the outermost level.
    var browserData = { sessionId: this.sessionId };

    if (typeof location !== 'undefined') {
      browserData.url = location.href;
    }

    // Store API key in scope external from .get callback
    var apiKey = this.apiKey;

    try {
      var options = { excludes: { touchSupport: true}};

      Fingerprint2.get(options, function(components) {
        for (var i = 0, len = components.length; i < len; i++) {
          // We took the liberty of camelCasing all our expected keys server-side. Ensure they match up here.
          var sanitizedKey = components[i].key.replace(/_([a-z])/gi, function(c) {return c[1].toUpperCase();});

          var val = components[i].value;

          // Some keys have changed types between Fingerprint2 version 1.8 and 2.0.
          // We need to convert them back to their 1.8 versions (which is what our backend expects).
          // Start with fields that went from int => bool. Convert them back to ints.
          if (['sessionStorage', 'localStorage', 'indexedDb', 'openDatabase'].indexOf(sanitizedKey) !== -1) {
            if (val === 'error') {
              val = 0; // false
            } else {
              val = val + 0; // bool => int
            }
          }

          // Screen resolution fields have changed to specifically include the word 'screen' in 2.0.
          // Let's change them back to their 1.8 values (which is what our backend expects).
          if (sanitizedKey === 'screenResolution') {
            sanitizedKey = 'resolution';
          } else if (sanitizedKey === 'availableScreenResolution') {
            sanitizedKey = 'availableResolution';
          }

          browserData[sanitizedKey] = val;
        }

        browserData.fonts = x64hash128(browserData.fonts.toString());
        browserData.canvas = x64hash128(browserData.canvas[1]);
        browserData.webgl = x64hash128(browserData.webgl[0]);
        browserData.browser = getBrowser();

        payload.browser = browserData;

        sendToRavelin(apiKey, FINGERPRINT_URL, payload, cb);
      });
    } catch (e) {
      try {
        sendErrorToRavelin(apiKey, e, payload, cb);
      } catch (e) {
        // Give up trying to send error details to Ravelin
        handleCallback(cb, e);
      }
    }
  }

   /**
   * track invokes the Ravelin client-side tracking script. You must have set
   * the public API key in advance of calling track, so that it can submit the
   * data directly to Ravelin. Its execution is asynchronous.
   *
   * @param {String} eventName A description of what has occurred.
   * @param {Object} meta Any additional metadata you wish to use to describe the page.
   * @param {Function} callback Optional callback function to execute upon completion, passing an error if one occured.
   * @example
   * // track when a customer uses search functionality
   * ravelinjs.track('CUSTOMER_SEARCHED', { searchType: 'product' });
   *
   * // track without any additional metadata
   * ravelinjs.track('CUSTOMER_SEARCHED');
   */
  RavelinJS.prototype.track = function(eventName, eventProperties, cb) {
    var payload = outerPayload(this.customerId,
                               this.tempCustomerId,
                               this.orderId);

    var trackingPayload = trackPayload(payload, this.deviceId, this.sessionId, eventName, eventProperties);

    try {
      sendToRavelin(this.apiKey, CLICKSTREAM_URL, trackingPayload, cb);
    } catch (e) {
      // Ignore errors sending clickstream data.
      handleCallback(cb, e);
    }
  }

  /**
   * trackPage logs the page view. Call this from as many pages as possible.
   *
   * @param {Object} meta Any additional metadata you wish to use to describe the page.
   * @param {Function} callback Optional callback function to execute upon completion, passing an error if one occured.
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
  }

  /**
   * trackLogin informs Ravelin of customers logging into your site.
   *
   * @param {Object} meta Any additional metadata you wish to use to describe the event.
   * @param {Function} callback Optional callback function to execute upon completion, passing an error if one occured.
   * @example
   * ravelinjs.trackLogin('cust123', {...}); // Called immediately after your login logic.
   */
  RavelinJS.prototype.trackLogin = function(customerId, eventProperties, cb) {
    if (customerId) {
      this.setCustomerId(customerId);
    }

    this.track(LOGIN_EVENT_NAME, eventProperties, cb);
  }

  /**
   * trackLogout informs Ravelin of logout events and resets the associated customerId and tempCustomerId.
   * Call this function immediately before your own logout logic is executed.
   *
   * @param {Object} meta Any additional metadata you wish to use to describe the event.
   * @param {Function} callback Optional callback function to execute upon completion, passing an error if one occured.
   * @example
   * ravelinjs.trackLogout(); // Called before you begin your logout process
   */
  RavelinJS.prototype.trackLogout = function(eventProperties, cb) {
    this.track(LOGOUT_EVENT_NAME, eventProperties, cb);
    this.customerId = undefined;
    this.tempCustomerId = undefined;
    this.orderId = undefined;
  }

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

    // Maintain the same device/sessionIds, but store them now under the new domain
    writeCookie(DEVICEID_STORAGE_NAME, this.deviceId, NO_EXPIRE, null, this.cookieDomain);
    writeCookie(SESSIONID_COOKIE_NAME, this.sessionId, null, null, this.cookieDomain);
  }

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
  }

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

    if (this.deviceId) {
      // If deviceId is present in instance but not cookies, ensure it is also assigned to our cookies
      writeCookie(DEVICEID_STORAGE_NAME, this.deviceId, NO_EXPIRE, null);
      return;
    }

    // If no deviceId located, instantiate one and write to cookies
    this.deviceId = 'rjs-' + this.uuid();
    writeCookie(DEVICEID_STORAGE_NAME, this.deviceId, NO_EXPIRE, null);
  }

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
  }

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
  }

  // ========================================================================================================
  //
  // private functions
  //
  function aesEncrypt(plaintext) {
    var aesKeyLength = 256;
    var wordCount = aesKeyLength/32;
    var paranoiaCount = 4; // 128 bits of entropy

    var sessionKey = sjcl.random.randomWords(wordCount, paranoiaCount);
    var iv = sjcl.random.randomWords(wordCount, paranoiaCount);

    var aesBlockCipher = new sjcl.cipher.aes(sessionKey);
    var bits = sjcl.codec.utf8String.toBits(plaintext);
    var cipher = sjcl.mode.gcm.encrypt(aesBlockCipher, bits, iv, null, 128);

    return {
      ciphertextB64: sjcl.codec.base64.fromBits(cipher),
      aesKeyB64: sjcl.codec.base64.fromBits(sessionKey),
      ivB64: sjcl.codec.base64.fromBits(iv)
    };
  }

  function rsaEncrypt(rsa, aesKeyB64, ivB64) {
    var encryptedHex = rsa.encrypt(aesKeyB64 + '|' + ivB64);
    var encryptedBits = sjcl.codec.hex.toBits(encryptedHex);
    var aesKeyAndIVCiphertextBase64 = sjcl.codec.base64.fromBits(encryptedBits);

    return aesKeyAndIVCiphertextBase64;
  }

  function getBrowser() {
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

  function sensitiveElement(elem) {
    if (elem) {
      if (elem.type === 'password') {
        return true;
      }

      var noTrackAttr = (elem.dataset && elem.dataset.rvnSensitive) || elem.getAttribute('data-rvn-sensitive');
      if (noTrackAttr !== undefined && noTrackAttr !== null && noTrackAttr !== 'false') {
        return true;
      }
    }

    return false;
  }

  function cleanPan(str) {
    var regex = /\b(?:\d[ -]*){12,16}\d\b/g;

    if (regex.test(str)) {
      return str.replace(regex, function(match) {
        var bin = match.substr(0, 6);
        var lastFour = match.substr(match.length - 4);
        var redact = match.substring(6, match.length - 4).replace(/./g, "X");
        return bin + redact + lastFour;
      });
    }

    return str;
  }

  function getSelectionPosition(input) {
    var selectionPos = null;
    if (input && (typeof input.selectionStart === 'number') && (typeof input.selectionEnd === 'number')) {
      selectionPos = {
        start: input.selectionStart,
        end: input.selectionEnd
      };
    }

    return selectionPos;
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
      return
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

  function sendToRavelin(apiKey, url, payload, cb) {
    if (!apiKey) {
      throw new Error('[ravelinjs] "apiKey" is null or undefined');
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
            handleCallback(cb, new Error('[ravelinjs] Error occured sending payload to ' + url));
          }
        }
      };
    } else {
      handleCallback(cb);
    }
  }

  function sendErrorToRavelin(apiKey, err, payload) {
    // Capture the stack trace if it is supported in the browser.
    if (err.stack) {
      payload.error = err.stack.toString();
    } else {
      payload.error = err.toString();
    }

    sendToRavelin(apiKey, FINGERPRINT_ERROR_URL, payload);
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

  // ========================================================================================================
  //
  // MurmurHash3 related functions
  //

  // We've copied these out from fingerprint2 so we can use them inside ravelinjs after the fingerprint has
  // completed to compress down the size of the canvas/webgl/fontlists we send to the server

  //
  // Given two 64bit ints (as an array of two 32bit ints) returns the two
  // added together as a 64bit int (as an array of two 32bit ints).
  //
  function x64Add(m, n) {
    m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff]
    n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff]
    var o = [0, 0, 0, 0]
    o[3] += m[3] + n[3]
    o[2] += o[3] >>> 16
    o[3] &= 0xffff
    o[2] += m[2] + n[2]
    o[1] += o[2] >>> 16
    o[2] &= 0xffff
    o[1] += m[1] + n[1]
    o[0] += o[1] >>> 16
    o[1] &= 0xffff
    o[0] += m[0] + n[0]
    o[0] &= 0xffff
    return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]]
  }

  //
  // Given two 64bit ints (as an array of two 32bit ints) returns the two
  // multiplied together as a 64bit int (as an array of two 32bit ints).
  //
  function x64Multiply(m, n) {
    m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff]
    n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff]
    var o = [0, 0, 0, 0]
    o[3] += m[3] * n[3]
    o[2] += o[3] >>> 16
    o[3] &= 0xffff
    o[2] += m[2] * n[3]
    o[1] += o[2] >>> 16
    o[2] &= 0xffff
    o[2] += m[3] * n[2]
    o[1] += o[2] >>> 16
    o[2] &= 0xffff
    o[1] += m[1] * n[3]
    o[0] += o[1] >>> 16
    o[1] &= 0xffff
    o[1] += m[2] * n[2]
    o[0] += o[1] >>> 16
    o[1] &= 0xffff
    o[1] += m[3] * n[1]
    o[0] += o[1] >>> 16
    o[1] &= 0xffff
    o[0] += (m[0] * n[3]) + (m[1] * n[2]) + (m[2] * n[1]) + (m[3] * n[0])
    o[0] &= 0xffff
    return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]]
  }
  //
  // Given a 64bit int (as an array of two 32bit ints) and an int
  // representing a number of bit positions, returns the 64bit int (as an
  // array of two 32bit ints) rotated left by that number of positions.
  //
  function x64Rotl(m, n) {
    n %= 64
    if (n === 32) {
      return [m[1], m[0]]
    } else if (n < 32) {
      return [(m[0] << n) | (m[1] >>> (32 - n)), (m[1] << n) | (m[0] >>> (32 - n))]
    } else {
      n -= 32
      return [(m[1] << n) | (m[0] >>> (32 - n)), (m[0] << n) | (m[1] >>> (32 - n))]
    }
  }
  //
  // Given a 64bit int (as an array of two 32bit ints) and an int
  // representing a number of bit positions, returns the 64bit int (as an
  // array of two 32bit ints) shifted left by that number of positions.
  //
  function x64LeftShift(m, n) {
    n %= 64
    if (n === 0) {
      return m
    } else if (n < 32) {
      return [(m[0] << n) | (m[1] >>> (32 - n)), m[1] << n]
    } else {
      return [m[1] << (n - 32), 0]
    }
  }
  //
  // Given two 64bit ints (as an array of two 32bit ints) returns the two
  // xored together as a 64bit int (as an array of two 32bit ints).
  //
  function x64Xor(m, n) {
    return [m[0] ^ n[0], m[1] ^ n[1]]
  }
  //
  // Given a block, returns murmurHash3's final x64 mix of that block.
  // (`[0, h[0] >>> 1]` is a 33 bit unsigned right shift. This is the
  // only place where we need to right shift 64bit ints.)
  //
  function x64Fmix(h) {
    h = x64Xor(h, [0, h[0] >>> 1])
    h = x64Multiply(h, [0xff51afd7, 0xed558ccd])
    h = x64Xor(h, [0, h[0] >>> 1])
    h = x64Multiply(h, [0xc4ceb9fe, 0x1a85ec53])
    h = x64Xor(h, [0, h[0] >>> 1])
    return h
  }

  //
  // Given a string and an optional seed as an int, returns a 128 bit
  // hash using the x64 flavor of MurmurHash3, as an unsigned hex.
  //
  function x64hash128(key, seed) {
    key = key || ''
    seed = seed || 0
    var remainder = key.length % 16
    var bytes = key.length - remainder
    var h1 = [0, seed]
    var h2 = [0, seed]
    var k1 = [0, 0]
    var k2 = [0, 0]
    var c1 = [0x87c37b91, 0x114253d5]
    var c2 = [0x4cf5ad43, 0x2745937f]
    for (var i = 0; i < bytes; i = i + 16) {
      k1 = [((key.charCodeAt(i + 4) & 0xff)) | ((key.charCodeAt(i + 5) & 0xff) << 8) | ((key.charCodeAt(i + 6) & 0xff) << 16) | ((key.charCodeAt(i + 7) & 0xff) << 24), ((key.charCodeAt(i) & 0xff)) | ((key.charCodeAt(i + 1) & 0xff) << 8) | ((key.charCodeAt(i + 2) & 0xff) << 16) | ((key.charCodeAt(i + 3) & 0xff) << 24)]
      k2 = [((key.charCodeAt(i + 12) & 0xff)) | ((key.charCodeAt(i + 13) & 0xff) << 8) | ((key.charCodeAt(i + 14) & 0xff) << 16) | ((key.charCodeAt(i + 15) & 0xff) << 24), ((key.charCodeAt(i + 8) & 0xff)) | ((key.charCodeAt(i + 9) & 0xff) << 8) | ((key.charCodeAt(i + 10) & 0xff) << 16) | ((key.charCodeAt(i + 11) & 0xff) << 24)]
      k1 = x64Multiply(k1, c1)
      k1 = x64Rotl(k1, 31)
      k1 = x64Multiply(k1, c2)
      h1 = x64Xor(h1, k1)
      h1 = x64Rotl(h1, 27)
      h1 = x64Add(h1, h2)
      h1 = x64Add(x64Multiply(h1, [0, 5]), [0, 0x52dce729])
      k2 = x64Multiply(k2, c2)
      k2 = x64Rotl(k2, 33)
      k2 = x64Multiply(k2, c1)
      h2 = x64Xor(h2, k2)
      h2 = x64Rotl(h2, 31)
      h2 = x64Add(h2, h1)
      h2 = x64Add(x64Multiply(h2, [0, 5]), [0, 0x38495ab5])
    }
    k1 = [0, 0]
    k2 = [0, 0]
    switch (remainder) {
      case 15:
        k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 14)], 48))
      // fallthrough
      case 14:
        k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 13)], 40))
      // fallthrough
      case 13:
        k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 12)], 32))
      // fallthrough
      case 12:
        k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 11)], 24))
      // fallthrough
      case 11:
        k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 10)], 16))
      // fallthrough
      case 10:
        k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 9)], 8))
      // fallthrough
      case 9:
        k2 = x64Xor(k2, [0, key.charCodeAt(i + 8)])
        k2 = x64Multiply(k2, c2)
        k2 = x64Rotl(k2, 33)
        k2 = x64Multiply(k2, c1)
        h2 = x64Xor(h2, k2)
      // fallthrough
      case 8:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 7)], 56))
      // fallthrough
      case 7:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 6)], 48))
      // fallthrough
      case 6:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 5)], 40))
      // fallthrough
      case 5:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 4)], 32))
      // fallthrough
      case 4:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 3)], 24))
      // fallthrough
      case 3:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 2)], 16))
      // fallthrough
      case 2:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 1)], 8))
      // fallthrough
      case 1:
        k1 = x64Xor(k1, [0, key.charCodeAt(i)])
        k1 = x64Multiply(k1, c1)
        k1 = x64Rotl(k1, 31)
        k1 = x64Multiply(k1, c2)
        h1 = x64Xor(h1, k1)
      // fallthrough
    }
    h1 = x64Xor(h1, [0, key.length])
    h2 = x64Xor(h2, [0, key.length])
    h1 = x64Add(h1, h2)
    h2 = x64Add(h2, h1)
    h1 = x64Fmix(h1)
    h2 = x64Fmix(h2)
    h1 = x64Add(h1, h2)
    h2 = x64Add(h2, h1)
    return ('00000000' + (h1[0] >>> 0).toString(16)).slice(-8) + ('00000000' + (h1[1] >>> 0).toString(16)).slice(-8) + ('00000000' + (h2[0] >>> 0).toString(16)).slice(-8) + ('00000000' + (h2[1] >>> 0).toString(16)).slice(-8)
  }

  /*
  * Fingerprintjs2 2.0.0 - Modern & flexible browser fingerprint library v2
  * https://github.com/Valve/fingerprintjs2
  * Copyright (c) 2015 Valentin Vasilyev (valentin.vasilyev@outlook.com)
  * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
  *
  * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  * ARE DISCLAIMED. IN NO EVENT SHALL VALENTIN VASILYEV BE LIABLE FOR ANY
  * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  */

  (function (name, context, definition) {
    'use strict'
    if (typeof window !== 'undefined' && typeof window.define === 'function' && window.define.amd) { window.define(definition) } else if (typeof module !== 'undefined' && module.exports) { module.exports = definition() } else if (context.exports) { context.exports = definition() } else { context[name] = definition() }
  })('Fingerprint2', this, function () {
    'use strict'

    var defaultOptions = {
      preprocessor: null,
      audio: {
        timeout: 1000,
          // On iOS 11, audio context can only be used in response to user interaction.
          // We require users to explicitly enable audio fingerprinting on iOS 11.
          // See https://stackoverflow.com/questions/46363048/onaudioprocess-not-called-on-ios11#46534088
        excludeIOS11: true
      },
      fonts: {
        swfContainerId: 'fingerprintjs2',
        swfPath: 'flash/compiled/FontList.swf',
        userDefinedFonts: [],
        extendedJsFonts: false
      },
      screen: {
        // To ensure consistent fingerprints when users rotate their mobile devices
        detectScreenOrientation: true
      },
      plugins: {
        sortPluginsFor: [/palemoon/i],
        excludeIE: false
      },
      extraComponents: [],
      excludes: {
        // Unreliable on Windows, see https://github.com/Valve/fingerprintjs2/issues/375
        'enumerateDevices': true,
        // devicePixelRatio depends on browser zoom, and it's impossible to detect browser zoom
        'pixelRatio': true,
        // DNT depends on incognito mode for some browsers (Chrome) and it's impossible to detect incognito mode
        'doNotTrack': true,
        // uses js fonts already
        'fontsFlash': true
      },
      NOT_AVAILABLE: 'not available',
      ERROR: 'error',
      EXCLUDED: 'excluded'
    }

    var each = function (obj, iterator) {
      if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
        obj.forEach(iterator)
      } else if (obj.length === +obj.length) {
        for (var i = 0, l = obj.length; i < l; i++) {
          iterator(obj[i], i, obj)
        }
      } else {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            iterator(obj[key], key, obj)
          }
        }
      }
    }

    var map = function (obj, iterator) {
      var results = []
      // Not using strict equality so that this acts as a
      // shortcut to checking for `null` and `undefined`.
      if (obj == null) {
        return results
      }
      if (Array.prototype.map && obj.map === Array.prototype.map) { return obj.map(iterator) }
      each(obj, function (value, index, list) {
        results.push(iterator(value, index, list))
      })
      return results
    }

    var extendSoft = function (target, source) {
      if (source == null) { return target }
      var value
      var key
      for (key in source) {
        value = source[key]
        if (value != null && !(Object.prototype.hasOwnProperty.call(target, key))) {
          target[key] = value
        }
      }
      return target
    }

  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices
    var enumerateDevicesKey = function (done, options) {
      if (!isEnumerateDevicesSupported()) {
        return done(options.NOT_AVAILABLE)
      }
      navigator.mediaDevices.enumerateDevices().then(function (devices) {
        done(devices.map(function (device) {
          return 'id=' + device.deviceId + ';gid=' + device.groupId + ';' + device.kind + ';' + device.label
        }))
      })
      setTimeout(done, 150);
    }

    var isEnumerateDevicesSupported = function () {
      return (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
    }
  // Inspired by and based on https://github.com/cozylife/audio-fingerprint
    var audioKey = function (done, options) {
      var audioOptions = options.audio
      if (audioOptions.excludeIOS11 && navigator.userAgent.match(/OS 11.+Version\/11.+Safari/)) {
          // See comment for excludeUserAgent and https://stackoverflow.com/questions/46363048/onaudioprocess-not-called-on-ios11#46534088
        return done(options.EXCLUDED)
      }

      var AudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext

      if (AudioContext == null) {
        return done(options.NOT_AVAILABLE)
      }

      var context = new AudioContext(1, 44100, 44100)

      var oscillator = context.createOscillator()
      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(10000, context.currentTime)

      var compressor = context.createDynamicsCompressor()
      each([
          ['threshold', -50],
          ['knee', 40],
          ['ratio', 12],
          ['reduction', -20],
          ['attack', 0],
          ['release', 0.25]
      ], function (item) {
        if (compressor[item[0]] !== undefined && typeof compressor[item[0]].setValueAtTime === 'function') {
          compressor[item[0]].setValueAtTime(item[1], context.currentTime)
        }
      })

      oscillator.connect(compressor)
      compressor.connect(context.destination)
      oscillator.start(0)
      context.startRendering()

      var audioTimeoutId = setTimeout(function () {
        console.warn('Audio fingerprint timed out. Please report bug at https://github.com/Valve/fingerprintjs2 with your user agent: "' + navigator.userAgent + '".')
        context.oncomplete = function () {}
        context = null
        return done('audioTimeout')
      }, audioOptions.timeout)

      context.oncomplete = function (event) {
        var fingerprint
        try {
          clearTimeout(audioTimeoutId)
          fingerprint = event.renderedBuffer.getChannelData(0)
              .slice(4500, 5000)
              .reduce(function (acc, val) { return acc + Math.abs(val) }, 0)
              .toString()
          oscillator.disconnect()
          compressor.disconnect()
        } catch (error) {
          done(error)
          return
        }
        done(fingerprint)
      }
    }
    var UserAgent = function (done) {
      done(navigator.userAgent)
    }
    var languageKey = function (done, options) {
      done(navigator.language || navigator.userLanguage || navigator.browserLanguage || navigator.systemLanguage || options.NOT_AVAILABLE)
    }
    var colorDepthKey = function (done, options) {
      done(window.screen.colorDepth || options.NOT_AVAILABLE)
    }
    var deviceMemoryKey = function (done, options) {
      done(navigator.deviceMemory || options.NOT_AVAILABLE)
    }
    var pixelRatioKey = function (done, options) {
      done(window.devicePixelRatio || options.NOT_AVAILABLE)
    }
    var screenResolutionKey = function (done, options) {
      done(getScreenResolution(options))
    }
    var getScreenResolution = function (options) {
      var resolution = [window.screen.width, window.screen.height]
      if (options.screen.detectScreenOrientation) {
        resolution.sort().reverse()
      }
      return resolution
    }
    var availableScreenResolutionKey = function (done, options) {
      done(getAvailableScreenResolution(options))
    }
    var getAvailableScreenResolution = function (options) {
      if (window.screen.availWidth && window.screen.availHeight) {
        var available = [window.screen.availHeight, window.screen.availWidth]
        if (options.screen.detectScreenOrientation) {
          available.sort().reverse()
        }
        return available
      }
      // headless browsers
      return options.NOT_AVAILABLE
    }
    var timezoneOffset = function (done) {
      done(new Date().getTimezoneOffset())
    }
    var timezone = function (done, options) {
      if (window.Intl && window.Intl.DateTimeFormat) {
        done(new window.Intl.DateTimeFormat().resolvedOptions().timeZone)
        return
      }
      done(options.NOT_AVAILABLE)
    }
    var sessionStorageKey = function (done, options) {
      done(hasSessionStorage(options))
    }
    var localStorageKey = function (done, options) {
      done(hasLocalStorage(options))
    }
    var indexedDbKey = function (done, options) {
      done(hasIndexedDB(options))
    }
    var addBehaviorKey = function (done) {
        // body might not be defined at this point or removed programmatically
      done(!!(document.body && document.body.addBehavior))
    }
    var openDatabaseKey = function (done) {
      done(!!window.openDatabase)
    }
    var cpuClassKey = function (done, options) {
      done(getNavigatorCpuClass(options))
    }
    var platformKey = function (done, options) {
      done(getNavigatorPlatform(options))
    }
    var doNotTrackKey = function (done, options) {
      done(getDoNotTrack(options))
    }
    var canvasKey = function (done, options) {
      if (isCanvasSupported()) {
        done(getCanvasFp(options))
        return
      }
      done(options.NOT_AVAILABLE)
    }
    var webglKey = function (done, options) {
      if (isWebGlSupported()) {
        done(getWebglFp())
        return
      }
      done(options.NOT_AVAILABLE)
    }
    var webglVendorAndRendererKey = function (done) {
      if (isWebGlSupported()) {
        done(getWebglVendorAndRenderer())
        return
      }
      done()
    }
    var adBlockKey = function (done) {
      done(getAdBlock())
    }
    var hasLiedLanguagesKey = function (done) {
      done(getHasLiedLanguages())
    }
    var hasLiedResolutionKey = function (done) {
      done(getHasLiedResolution())
    }
    var hasLiedOsKey = function (done) {
      done(getHasLiedOs())
    }
    var hasLiedBrowserKey = function (done) {
      done(getHasLiedBrowser())
    }
  // flash fonts (will increase fingerprinting time 20X to ~ 130-150ms)
    var flashFontsKey = function (done, options) {
      // we do flash if swfobject is loaded
      if (!hasSwfObjectLoaded()) {
        return done('swf object not loaded')
      }
      if (!hasMinFlashInstalled()) {
        return done('flash not installed')
      }
      if (!options.fonts.swfPath) {
        return done('missing options.fonts.swfPath')
      }
      loadSwfAndDetectFonts(function (fonts) {
        done(fonts)
      }, options)
    }
  // kudos to http://www.lalit.org/lab/javascript-css-font-detect/
    var jsFontsKey = function (done, options) {
        // a font will be compared against all the three default fonts.
        // and if it doesn't match all 3 then that font is not available.
      var baseFonts = ['monospace', 'sans-serif', 'serif']

      var fontList = [
        'Andale Mono', 'Arial', 'Arial Black', 'Arial Hebrew', 'Arial MT', 'Arial Narrow', 'Arial Rounded MT Bold', 'Arial Unicode MS',
        'Bitstream Vera Sans Mono', 'Book Antiqua', 'Bookman Old Style',
        'Calibri', 'Cambria', 'Cambria Math', 'Century', 'Century Gothic', 'Century Schoolbook', 'Comic Sans', 'Comic Sans MS', 'Consolas', 'Courier', 'Courier New',
        'Geneva', 'Georgia',
        'Helvetica', 'Helvetica Neue',
        'Impact',
        'Lucida Bright', 'Lucida Calligraphy', 'Lucida Console', 'Lucida Fax', 'LUCIDA GRANDE', 'Lucida Handwriting', 'Lucida Sans', 'Lucida Sans Typewriter', 'Lucida Sans Unicode',
        'Microsoft Sans Serif', 'Monaco', 'Monotype Corsiva', 'MS Gothic', 'MS Outlook', 'MS PGothic', 'MS Reference Sans Serif', 'MS Sans Serif', 'MS Serif', 'MYRIAD', 'MYRIAD PRO',
        'Palatino', 'Palatino Linotype',
        'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Light', 'Segoe UI Semibold', 'Segoe UI Symbol',
        'Tahoma', 'Times', 'Times New Roman', 'Times New Roman PS', 'Trebuchet MS',
        'Verdana', 'Wingdings', 'Wingdings 2', 'Wingdings 3'
      ]

      if (options.fonts.extendedJsFonts) {
        var extendedFontList = [
          'Abadi MT Condensed Light', 'Academy Engraved LET', 'ADOBE CASLON PRO', 'Adobe Garamond', 'ADOBE GARAMOND PRO', 'Agency FB', 'Aharoni', 'Albertus Extra Bold', 'Albertus Medium', 'Algerian', 'Amazone BT', 'American Typewriter',
          'American Typewriter Condensed', 'AmerType Md BT', 'Andalus', 'Angsana New', 'AngsanaUPC', 'Antique Olive', 'Aparajita', 'Apple Chancery', 'Apple Color Emoji', 'Apple SD Gothic Neo', 'Arabic Typesetting', 'ARCHER',
          'ARNO PRO', 'Arrus BT', 'Aurora Cn BT', 'AvantGarde Bk BT', 'AvantGarde Md BT', 'AVENIR', 'Ayuthaya', 'Bandy', 'Bangla Sangam MN', 'Bank Gothic', 'BankGothic Md BT', 'Baskerville',
          'Baskerville Old Face', 'Batang', 'BatangChe', 'Bauer Bodoni', 'Bauhaus 93', 'Bazooka', 'Bell MT', 'Bembo', 'Benguiat Bk BT', 'Berlin Sans FB', 'Berlin Sans FB Demi', 'Bernard MT Condensed', 'BernhardFashion BT', 'BernhardMod BT', 'Big Caslon', 'BinnerD',
          'Blackadder ITC', 'BlairMdITC TT', 'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni 72 Smallcaps', 'Bodoni MT', 'Bodoni MT Black', 'Bodoni MT Condensed', 'Bodoni MT Poster Compressed',
          'Bookshelf Symbol 7', 'Boulder', 'Bradley Hand', 'Bradley Hand ITC', 'Bremen Bd BT', 'Britannic Bold', 'Broadway', 'Browallia New', 'BrowalliaUPC', 'Brush Script MT', 'Californian FB', 'Calisto MT', 'Calligrapher', 'Candara',
          'CaslonOpnface BT', 'Castellar', 'Centaur', 'Cezanne', 'CG Omega', 'CG Times', 'Chalkboard', 'Chalkboard SE', 'Chalkduster', 'Charlesworth', 'Charter Bd BT', 'Charter BT', 'Chaucer',
          'ChelthmITC Bk BT', 'Chiller', 'Clarendon', 'Clarendon Condensed', 'CloisterBlack BT', 'Cochin', 'Colonna MT', 'Constantia', 'Cooper Black', 'Copperplate', 'Copperplate Gothic', 'Copperplate Gothic Bold',
          'Copperplate Gothic Light', 'CopperplGoth Bd BT', 'Corbel', 'Cordia New', 'CordiaUPC', 'Cornerstone', 'Coronet', 'Cuckoo', 'Curlz MT', 'DaunPenh', 'Dauphin', 'David', 'DB LCD Temp', 'DELICIOUS', 'Denmark',
          'DFKai-SB', 'Didot', 'DilleniaUPC', 'DIN', 'DokChampa', 'Dotum', 'DotumChe', 'Ebrima', 'Edwardian Script ITC', 'Elephant', 'English 111 Vivace BT', 'Engravers MT', 'EngraversGothic BT', 'Eras Bold ITC', 'Eras Demi ITC', 'Eras Light ITC', 'Eras Medium ITC',
          'EucrosiaUPC', 'Euphemia', 'Euphemia UCAS', 'EUROSTILE', 'Exotc350 Bd BT', 'FangSong', 'Felix Titling', 'Fixedsys', 'FONTIN', 'Footlight MT Light', 'Forte',
          'FrankRuehl', 'Fransiscan', 'Freefrm721 Blk BT', 'FreesiaUPC', 'Freestyle Script', 'French Script MT', 'FrnkGothITC Bk BT', 'Fruitger', 'FRUTIGER',
          'Futura', 'Futura Bk BT', 'Futura Lt BT', 'Futura Md BT', 'Futura ZBlk BT', 'FuturaBlack BT', 'Gabriola', 'Galliard BT', 'Gautami', 'Geeza Pro', 'Geometr231 BT', 'Geometr231 Hv BT', 'Geometr231 Lt BT', 'GeoSlab 703 Lt BT',
          'GeoSlab 703 XBd BT', 'Gigi', 'Gill Sans', 'Gill Sans MT', 'Gill Sans MT Condensed', 'Gill Sans MT Ext Condensed Bold', 'Gill Sans Ultra Bold', 'Gill Sans Ultra Bold Condensed', 'Gisha', 'Gloucester MT Extra Condensed', 'GOTHAM', 'GOTHAM BOLD',
          'Goudy Old Style', 'Goudy Stout', 'GoudyHandtooled BT', 'GoudyOLSt BT', 'Gujarati Sangam MN', 'Gulim', 'GulimChe', 'Gungsuh', 'GungsuhChe', 'Gurmukhi MN', 'Haettenschweiler', 'Harlow Solid Italic', 'Harrington', 'Heather', 'Heiti SC', 'Heiti TC', 'HELV',
          'Herald', 'High Tower Text', 'Hiragino Kaku Gothic ProN', 'Hiragino Mincho ProN', 'Hoefler Text', 'Humanst 521 Cn BT', 'Humanst521 BT', 'Humanst521 Lt BT', 'Imprint MT Shadow', 'Incised901 Bd BT', 'Incised901 BT',
          'Incised901 Lt BT', 'INCONSOLATA', 'Informal Roman', 'Informal011 BT', 'INTERSTATE', 'IrisUPC', 'Iskoola Pota', 'JasmineUPC', 'Jazz LET', 'Jenson', 'Jester', 'Jokerman', 'Juice ITC', 'Kabel Bk BT', 'Kabel Ult BT', 'Kailasa', 'KaiTi', 'Kalinga', 'Kannada Sangam MN',
          'Kartika', 'Kaufmann Bd BT', 'Kaufmann BT', 'Khmer UI', 'KodchiangUPC', 'Kokila', 'Korinna BT', 'Kristen ITC', 'Krungthep', 'Kunstler Script', 'Lao UI', 'Latha', 'Leelawadee', 'Letter Gothic', 'Levenim MT', 'LilyUPC', 'Lithograph', 'Lithograph Light', 'Long Island',
          'Lydian BT', 'Magneto', 'Maiandra GD', 'Malayalam Sangam MN', 'Malgun Gothic',
          'Mangal', 'Marigold', 'Marion', 'Marker Felt', 'Market', 'Marlett', 'Matisse ITC', 'Matura MT Script Capitals', 'Meiryo', 'Meiryo UI', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Tai Le',
          'Microsoft Uighur', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU', 'MingLiU_HKSCS', 'MingLiU_HKSCS-ExtB', 'MingLiU-ExtB', 'Minion', 'Minion Pro', 'Miriam', 'Miriam Fixed', 'Mistral', 'Modern', 'Modern No. 20', 'Mona Lisa Solid ITC TT', 'Mongolian Baiti',
          'MONO', 'MoolBoran', 'Mrs Eaves', 'MS LineDraw', 'MS Mincho', 'MS PMincho', 'MS Reference Specialty', 'MS UI Gothic', 'MT Extra', 'MUSEO', 'MV Boli',
          'Nadeem', 'Narkisim', 'NEVIS', 'News Gothic', 'News GothicMT', 'NewsGoth BT', 'Niagara Engraved', 'Niagara Solid', 'Noteworthy', 'NSimSun', 'Nyala', 'OCR A Extended', 'Old Century', 'Old English Text MT', 'Onyx', 'Onyx BT', 'OPTIMA', 'Oriya Sangam MN',
          'OSAKA', 'OzHandicraft BT', 'Palace Script MT', 'Papyrus', 'Parchment', 'Party LET', 'Pegasus', 'Perpetua', 'Perpetua Titling MT', 'PetitaBold', 'Pickwick', 'Plantagenet Cherokee', 'Playbill', 'PMingLiU', 'PMingLiU-ExtB',
          'Poor Richard', 'Poster', 'PosterBodoni BT', 'PRINCETOWN LET', 'Pristina', 'PTBarnum BT', 'Pythagoras', 'Raavi', 'Rage Italic', 'Ravie', 'Ribbon131 Bd BT', 'Rockwell', 'Rockwell Condensed', 'Rockwell Extra Bold', 'Rod', 'Roman', 'Sakkal Majalla',
          'Santa Fe LET', 'Savoye LET', 'Sceptre', 'Script', 'Script MT Bold', 'SCRIPTINA', 'Serifa', 'Serifa BT', 'Serifa Th BT', 'ShelleyVolante BT', 'Sherwood',
          'Shonar Bangla', 'Showcard Gothic', 'Shruti', 'Signboard', 'SILKSCREEN', 'SimHei', 'Simplified Arabic', 'Simplified Arabic Fixed', 'SimSun', 'SimSun-ExtB', 'Sinhala Sangam MN', 'Sketch Rockwell', 'Skia', 'Small Fonts', 'Snap ITC', 'Snell Roundhand', 'Socket',
          'Souvenir Lt BT', 'Staccato222 BT', 'Steamer', 'Stencil', 'Storybook', 'Styllo', 'Subway', 'Swis721 BlkEx BT', 'Swiss911 XCm BT', 'Sylfaen', 'Synchro LET', 'System', 'Tamil Sangam MN', 'Technical', 'Teletype', 'Telugu Sangam MN', 'Tempus Sans ITC',
          'Terminal', 'Thonburi', 'Traditional Arabic', 'Trajan', 'TRAJAN PRO', 'Tristan', 'Tubular', 'Tunga', 'Tw Cen MT', 'Tw Cen MT Condensed', 'Tw Cen MT Condensed Extra Bold',
          'TypoUpright BT', 'Unicorn', 'Univers', 'Univers CE 55 Medium', 'Univers Condensed', 'Utsaah', 'Vagabond', 'Vani', 'Vijaya', 'Viner Hand ITC', 'VisualUI', 'Vivaldi', 'Vladimir Script', 'Vrinda', 'Westminster', 'WHITNEY', 'Wide Latin',
          'ZapfEllipt BT', 'ZapfHumnst BT', 'ZapfHumnst Dm BT', 'Zapfino', 'Zurich BlkEx BT', 'Zurich Ex BT', 'ZWAdobeF']
        fontList = fontList.concat(extendedFontList)
      }

      fontList = fontList.concat(options.fonts.userDefinedFonts)

        // remove duplicate fonts
      fontList = fontList.filter(function (font, position) {
        return fontList.indexOf(font) === position
      })

        // we use m or w because these two characters take up the maximum width.
        // And we use a LLi so that the same matching fonts can get separated
      var testString = 'mmmmmmmmmmlli'

        // we test using 72px font size, we may use any size. I guess larger the better.
      var testSize = '72px'

      var h = document.getElementsByTagName('body')[0]

        // div to load spans for the base fonts
      var baseFontsDiv = document.createElement('div')

        // div to load spans for the fonts to detect
      var fontsDiv = document.createElement('div')

      var defaultWidth = {}
      var defaultHeight = {}

        // creates a span where the fonts will be loaded
      var createSpan = function () {
        var s = document.createElement('span')
          /*
          * We need this css as in some weird browser this
          * span elements shows up for a microSec which creates a
          * bad user experience
          */
        s.style.position = 'absolute'
        s.style.left = '-9999px'
        s.style.fontSize = testSize

          // css font reset to reset external styles
        s.style.fontStyle = 'normal'
        s.style.fontWeight = 'normal'
        s.style.letterSpacing = 'normal'
        s.style.lineBreak = 'auto'
        s.style.lineHeight = 'normal'
        s.style.textTransform = 'none'
        s.style.textAlign = 'left'
        s.style.textDecoration = 'none'
        s.style.textShadow = 'none'
        s.style.whiteSpace = 'normal'
        s.style.wordBreak = 'normal'
        s.style.wordSpacing = 'normal'

        s.innerHTML = testString
        return s
      }

        // creates a span and load the font to detect and a base font for fallback
      var createSpanWithFonts = function (fontToDetect, baseFont) {
        var s = createSpan()
        s.style.fontFamily = "'" + fontToDetect + "'," + baseFont
        return s
      }

        // creates spans for the base fonts and adds them to baseFontsDiv
      var initializeBaseFontsSpans = function () {
        var spans = []
        for (var index = 0, length = baseFonts.length; index < length; index++) {
          var s = createSpan()
          s.style.fontFamily = baseFonts[index]
          baseFontsDiv.appendChild(s)
          spans.push(s)
        }
        return spans
      }

        // creates spans for the fonts to detect and adds them to fontsDiv
      var initializeFontsSpans = function () {
        var spans = {}
        for (var i = 0, l = fontList.length; i < l; i++) {
          var fontSpans = []
          for (var j = 0, numDefaultFonts = baseFonts.length; j < numDefaultFonts; j++) {
            var s = createSpanWithFonts(fontList[i], baseFonts[j])
            fontsDiv.appendChild(s)
            fontSpans.push(s)
          }
          spans[fontList[i]] = fontSpans // Stores {fontName : [spans for that font]}
        }
        return spans
      }

        // checks if a font is available
      var isFontAvailable = function (fontSpans) {
        var detected = false
        for (var i = 0; i < baseFonts.length; i++) {
          detected = (fontSpans[i].offsetWidth !== defaultWidth[baseFonts[i]] || fontSpans[i].offsetHeight !== defaultHeight[baseFonts[i]])
          if (detected) {
            return detected
          }
        }
        return detected
      }

        // create spans for base fonts
      var baseFontsSpans = initializeBaseFontsSpans()

        // add the spans to the DOM
      h.appendChild(baseFontsDiv)

        // get the default width for the three base fonts
      for (var index = 0, length = baseFonts.length; index < length; index++) {
        defaultWidth[baseFonts[index]] = baseFontsSpans[index].offsetWidth // width for the default font
        defaultHeight[baseFonts[index]] = baseFontsSpans[index].offsetHeight // height for the default font
      }

        // create spans for fonts to detect
      var fontsSpans = initializeFontsSpans()

        // add all the spans to the DOM
      h.appendChild(fontsDiv)

        // check available fonts
      var available = []
      for (var i = 0, l = fontList.length; i < l; i++) {
        if (isFontAvailable(fontsSpans[fontList[i]])) {
          available.push(fontList[i])
        }
      }

        // remove spans from DOM
      h.removeChild(fontsDiv)
      h.removeChild(baseFontsDiv)
      done(available)
    }
    var pluginsComponent = function (done, options) {
      if (isIE()) {
        if (!options.plugins.excludeIE) {
          done(getIEPlugins(options))
        } else {
          done(options.EXCLUDED)
        }
      } else {
        done(getRegularPlugins(options))
      }
    }
    var getRegularPlugins = function (options) {
      if (navigator.plugins == null) {
        return options.NOT_AVAILABLE
      }

      var plugins = []
        // plugins isn't defined in Node envs.
      for (var i = 0, l = navigator.plugins.length; i < l; i++) {
        if (navigator.plugins[i]) { plugins.push(navigator.plugins[i]) }
      }

        // sorting plugins only for those user agents, that we know randomize the plugins
        // every time we try to enumerate them
      if (pluginsShouldBeSorted(options)) {
        plugins = plugins.sort(function (a, b) {
          if (a.name > b.name) { return 1 }
          if (a.name < b.name) { return -1 }
          return 0
        })
      }
      return map(plugins, function (p) {
        var mimeTypes = map(p, function (mt) {
          return [mt.type, mt.suffixes]
        })
        return [p.name, p.description, mimeTypes]
      })
    }
    var getIEPlugins = function (options) {
      var result = []
      if ((Object.getOwnPropertyDescriptor && Object.getOwnPropertyDescriptor(window, 'ActiveXObject')) || ('ActiveXObject' in window)) {
        var names = [
          'AcroPDF.PDF', // Adobe PDF reader 7+
          'Adodb.Stream',
          'AgControl.AgControl', // Silverlight
          'DevalVRXCtrl.DevalVRXCtrl.1',
          'MacromediaFlashPaper.MacromediaFlashPaper',
          'Msxml2.DOMDocument',
          'Msxml2.XMLHTTP',
          'PDF.PdfCtrl', // Adobe PDF reader 6 and earlier, brrr
          'QuickTime.QuickTime', // QuickTime
          'QuickTimeCheckObject.QuickTimeCheck.1',
          'RealPlayer',
          'RealPlayer.RealPlayer(tm) ActiveX Control (32-bit)',
          'RealVideo.RealVideo(tm) ActiveX Control (32-bit)',
          'Scripting.Dictionary',
          'SWCtl.SWCtl', // ShockWave player
          'Shell.UIHelper',
          'ShockwaveFlash.ShockwaveFlash', // flash plugin
          'Skype.Detection',
          'TDCCtl.TDCCtl',
          'WMPlayer.OCX', // Windows media player
          'rmocx.RealPlayer G2 Control',
          'rmocx.RealPlayer G2 Control.1'
        ]
          // starting to detect plugins in IE
        result = map(names, function (name) {
          try {
              // eslint-disable-next-line no-new
            new window.ActiveXObject(name)
            return name
          } catch (e) {
            return options.ERROR
          }
        })
      } else {
        result.push(options.NOT_AVAILABLE)
      }
      if (navigator.plugins) {
        result = result.concat(getRegularPlugins(options))
      }
      return result
    }
    var pluginsShouldBeSorted = function (options) {
      var should = false
      for (var i = 0, l = options.plugins.sortPluginsFor.length; i < l; i++) {
        var re = options.plugins.sortPluginsFor[i]
        if (navigator.userAgent.match(re)) {
          should = true
          break
        }
      }
      return should
    }
    var touchSupportKey = function (done) {
      done(getTouchSupport())
    }
    var hardwareConcurrencyKey = function (done, options) {
      done(getHardwareConcurrency(options))
    }
    var hasSessionStorage = function (options) {
      try {
        return !!window.sessionStorage
      } catch (e) {
        return options.ERROR // SecurityError when referencing it means it exists
      }
    }

  // https://bugzilla.mozilla.org/show_bug.cgi?id=781447
    var hasLocalStorage = function (options) {
      try {
        return !!window.localStorage
      } catch (e) {
        return options.ERROR // SecurityError when referencing it means it exists
      }
    }
    var hasIndexedDB = function (options) {
      try {
        return !!window.indexedDB
      } catch (e) {
        return options.ERROR // SecurityError when referencing it means it exists
      }
    }
    var getHardwareConcurrency = function (options) {
      if (navigator.hardwareConcurrency) {
        return navigator.hardwareConcurrency
      }
      return options.NOT_AVAILABLE
    }
    var getNavigatorCpuClass = function (options) {
      return navigator.cpuClass || options.NOT_AVAILABLE
    }
    var getNavigatorPlatform = function (options) {
      if (navigator.platform) {
        return navigator.platform
      } else {
        return options.NOT_AVAILABLE
      }
    }
    var getDoNotTrack = function (options) {
      if (navigator.doNotTrack) {
        return navigator.doNotTrack
      } else if (navigator.msDoNotTrack) {
        return navigator.msDoNotTrack
      } else if (window.doNotTrack) {
        return window.doNotTrack
      } else {
        return options.NOT_AVAILABLE
      }
    }
  // This is a crude and primitive touch screen detection.
  // It's not possible to currently reliably detect the  availability of a touch screen
  // with a JS, without actually subscribing to a touch event.
  // http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
  // https://github.com/Modernizr/Modernizr/issues/548
  // method returns an array of 3 values:
  // maxTouchPoints, the success or failure of creating a TouchEvent,
  // and the availability of the 'ontouchstart' property

    var getTouchSupport = function () {
      var maxTouchPoints = 0
      var touchEvent
      if (typeof navigator.maxTouchPoints !== 'undefined') {
        maxTouchPoints = navigator.maxTouchPoints
      } else if (typeof navigator.msMaxTouchPoints !== 'undefined') {
        maxTouchPoints = navigator.msMaxTouchPoints
      }
      try {
        document.createEvent('TouchEvent')
        touchEvent = true
      } catch (_) {
        touchEvent = false
      }
      var touchStart = 'ontouchstart' in window
      return [maxTouchPoints, touchEvent, touchStart]
    }
  // https://www.browserleaks.com/canvas#how-does-it-work

    var getCanvasFp = function (options) {
      var result = []
        // Very simple now, need to make it more complex (geo shapes etc)
      var canvas = document.createElement('canvas')
      canvas.width = 2000
      canvas.height = 200
      canvas.style.display = 'inline'
      var ctx = canvas.getContext('2d')
        // detect browser support of canvas winding
        // http://blogs.adobe.com/webplatform/2013/01/30/winding-rules-in-canvas/
        // https://github.com/Modernizr/Modernizr/blob/master/feature-detects/canvas/winding.js
      ctx.rect(0, 0, 10, 10)
      ctx.rect(2, 2, 6, 6)
      result.push('canvas winding:' + ((ctx.isPointInPath(5, 5, 'evenodd') === false) ? 'yes' : 'no'))

      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#f60'
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = '#069'
        // https://github.com/Valve/fingerprintjs2/issues/66
      if (options.dontUseFakeFontInCanvas) {
        ctx.font = '11pt Arial'
      } else {
        ctx.font = '11pt no-real-font-123'
      }
      ctx.fillText('Cwm fjordbank glyphs vext quiz, \ud83d\ude03', 2, 15)
      ctx.fillStyle = 'rgba(102, 204, 0, 0.2)'
      ctx.font = '18pt Arial'
      ctx.fillText('Cwm fjordbank glyphs vext quiz, \ud83d\ude03', 4, 45)

        // canvas blending
        // http://blogs.adobe.com/webplatform/2013/01/28/blending-features-in-canvas/
        // http://jsfiddle.net/NDYV8/16/
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = 'rgb(255,0,255)'
      ctx.beginPath()
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgb(0,255,255)'
      ctx.beginPath()
      ctx.arc(100, 50, 50, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgb(255,255,0)'
      ctx.beginPath()
      ctx.arc(75, 100, 50, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgb(255,0,255)'
        // canvas winding
        // http://blogs.adobe.com/webplatform/2013/01/30/winding-rules-in-canvas/
        // http://jsfiddle.net/NDYV8/19/
      ctx.arc(75, 75, 75, 0, Math.PI * 2, true)
      ctx.arc(75, 75, 25, 0, Math.PI * 2, true)
      ctx.fill('evenodd')

      if (canvas.toDataURL) { result.push('canvas fp:' + canvas.toDataURL()) }
      return result
    }
    var getWebglFp = function () {
      var gl
      var fa2s = function (fa) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0)
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        return '[' + fa[0] + ', ' + fa[1] + ']'
      }
      var maxAnisotropy = function (gl) {
        var ext = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') || gl.getExtension('MOZ_EXT_texture_filter_anisotropic')
        if (ext) {
          var anisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
          if (anisotropy === 0) {
            anisotropy = 2
          }
          return anisotropy
        } else {
          return null
        }
      }

      gl = getWebglCanvas()
      if (!gl) { return null }
        // WebGL fingerprinting is a combination of techniques, found in MaxMind antifraud script & Augur fingerprinting.
        // First it draws a gradient object with shaders and convers the image to the Base64 string.
        // Then it enumerates all WebGL extensions & capabilities and appends them to the Base64 string, resulting in a huge WebGL string, potentially very unique on each device
        // Since iOS supports webgl starting from version 8.1 and 8.1 runs on several graphics chips, the results may be different across ios devices, but we need to verify it.
      var result = []
      var vShaderTemplate = 'attribute vec2 attrVertex;varying vec2 varyinTexCoordinate;uniform vec2 uniformOffset;void main(){varyinTexCoordinate=attrVertex+uniformOffset;gl_Position=vec4(attrVertex,0,1);}'
      var fShaderTemplate = 'precision mediump float;varying vec2 varyinTexCoordinate;void main() {gl_FragColor=vec4(varyinTexCoordinate,0,1);}'
      var vertexPosBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer)
      var vertices = new Float32Array([-0.2, -0.9, 0, 0.4, -0.26, 0, 0, 0.732134444, 0])
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
      vertexPosBuffer.itemSize = 3
      vertexPosBuffer.numItems = 3
      var program = gl.createProgram()
      var vshader = gl.createShader(gl.VERTEX_SHADER)
      gl.shaderSource(vshader, vShaderTemplate)
      gl.compileShader(vshader)
      var fshader = gl.createShader(gl.FRAGMENT_SHADER)
      gl.shaderSource(fshader, fShaderTemplate)
      gl.compileShader(fshader)
      gl.attachShader(program, vshader)
      gl.attachShader(program, fshader)
      gl.linkProgram(program)
      gl.useProgram(program)
      program.vertexPosAttrib = gl.getAttribLocation(program, 'attrVertex')
      program.offsetUniform = gl.getUniformLocation(program, 'uniformOffset')
      gl.enableVertexAttribArray(program.vertexPosArray)
      gl.vertexAttribPointer(program.vertexPosAttrib, vertexPosBuffer.itemSize, gl.FLOAT, !1, 0, 0)
      gl.uniform2f(program.offsetUniform, 1, 1)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexPosBuffer.numItems)
      try {
        result.push(gl.canvas.toDataURL())
      } catch (e) {
          /* .toDataURL may be absent or broken (blocked by extension) */
      }
      result.push('extensions:' + (gl.getSupportedExtensions() || []).join(';'))
      result.push('webgl aliased line width range:' + fa2s(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)))
      result.push('webgl aliased point size range:' + fa2s(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)))
      result.push('webgl alpha bits:' + gl.getParameter(gl.ALPHA_BITS))
      result.push('webgl antialiasing:' + (gl.getContextAttributes().antialias ? 'yes' : 'no'))
      result.push('webgl blue bits:' + gl.getParameter(gl.BLUE_BITS))
      result.push('webgl depth bits:' + gl.getParameter(gl.DEPTH_BITS))
      result.push('webgl green bits:' + gl.getParameter(gl.GREEN_BITS))
      result.push('webgl max anisotropy:' + maxAnisotropy(gl))
      result.push('webgl max combined texture image units:' + gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS))
      result.push('webgl max cube map texture size:' + gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE))
      result.push('webgl max fragment uniform vectors:' + gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS))
      result.push('webgl max render buffer size:' + gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))
      result.push('webgl max texture image units:' + gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS))
      result.push('webgl max texture size:' + gl.getParameter(gl.MAX_TEXTURE_SIZE))
      result.push('webgl max varying vectors:' + gl.getParameter(gl.MAX_VARYING_VECTORS))
      result.push('webgl max vertex attribs:' + gl.getParameter(gl.MAX_VERTEX_ATTRIBS))
      result.push('webgl max vertex texture image units:' + gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS))
      result.push('webgl max vertex uniform vectors:' + gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS))
      result.push('webgl max viewport dims:' + fa2s(gl.getParameter(gl.MAX_VIEWPORT_DIMS)))
      result.push('webgl red bits:' + gl.getParameter(gl.RED_BITS))
      result.push('webgl renderer:' + gl.getParameter(gl.RENDERER))
      result.push('webgl shading language version:' + gl.getParameter(gl.SHADING_LANGUAGE_VERSION))
      result.push('webgl stencil bits:' + gl.getParameter(gl.STENCIL_BITS))
      result.push('webgl vendor:' + gl.getParameter(gl.VENDOR))
      result.push('webgl version:' + gl.getParameter(gl.VERSION))

      try {
          // Add the unmasked vendor and unmasked renderer if the debug_renderer_info extension is available
        var extensionDebugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info')
        if (extensionDebugRendererInfo) {
          result.push('webgl unmasked vendor:' + gl.getParameter(extensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL))
          result.push('webgl unmasked renderer:' + gl.getParameter(extensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL))
        }
      } catch (e) { /* squelch */ }

      if (!gl.getShaderPrecisionFormat) {
        return result
      }

      each(['FLOAT', 'INT'], function (numType) {
        each(['VERTEX', 'FRAGMENT'], function (shader) {
          each(['HIGH', 'MEDIUM', 'LOW'], function (numSize) {
            each(['precision', 'rangeMin', 'rangeMax'], function (key) {
              var format = gl.getShaderPrecisionFormat(gl[shader + '_SHADER'], gl[numSize + '_' + numType])[key]
              if (key !== 'precision') {
                key = 'precision ' + key
              }
              var line = ['webgl ', shader.toLowerCase(), ' shader ', numSize.toLowerCase(), ' ', numType.toLowerCase(), ' ', key, ':', format].join('')
              result.push(line)
            })
          })
        })
      })
      return result
    }
    var getWebglVendorAndRenderer = function () {
        /* This a subset of the WebGL fingerprint with a lot of entropy, while being reasonably browser-independent */
      try {
        var glContext = getWebglCanvas()
        var extensionDebugRendererInfo = glContext.getExtension('WEBGL_debug_renderer_info')
        return glContext.getParameter(extensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL) + '~' + glContext.getParameter(extensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL)
      } catch (e) {
        return null
      }
    }
    var getAdBlock = function () {
      var ads = document.createElement('div')
      ads.innerHTML = '&nbsp;'
      ads.className = 'adsbox'
      var result = false
      try {
          // body may not exist, that's why we need try/catch
        document.body.appendChild(ads)
        result = document.getElementsByClassName('adsbox')[0].offsetHeight === 0
        document.body.removeChild(ads)
      } catch (e) {
        result = false
      }
      return result
    }
    var getHasLiedLanguages = function () {
        // We check if navigator.language is equal to the first language of navigator.languages
      if (typeof navigator.languages !== 'undefined') {
        try {
          var firstLanguages = navigator.languages[0].substr(0, 2)
          if (firstLanguages !== navigator.language.substr(0, 2)) {
            return true
          }
        } catch (err) {
          return true
        }
      }
      return false
    }
    var getHasLiedResolution = function () {
      return window.screen.width < window.screen.availWidth || window.screen.height < window.screen.availHeight
    }
    var getHasLiedOs = function () {
      var userAgent = navigator.userAgent.toLowerCase()
      var oscpu = navigator.oscpu
      var platform = navigator.platform.toLowerCase()
      var os
        // We extract the OS from the user agent (respect the order of the if else if statement)
      if (userAgent.indexOf('windows phone') >= 0) {
        os = 'Windows Phone'
      } else if (userAgent.indexOf('win') >= 0) {
        os = 'Windows'
      } else if (userAgent.indexOf('android') >= 0) {
        os = 'Android'
      } else if (userAgent.indexOf('linux') >= 0) {
        os = 'Linux'
      } else if (userAgent.indexOf('iphone') >= 0 || userAgent.indexOf('ipad') >= 0) {
        os = 'iOS'
      } else if (userAgent.indexOf('mac') >= 0) {
        os = 'Mac'
      } else {
        os = 'Other'
      }
        // We detect if the person uses a mobile device
      var mobileDevice = (('ontouchstart' in window) ||
          (navigator.maxTouchPoints > 0) ||
          (navigator.msMaxTouchPoints > 0))

      if (mobileDevice && os !== 'Windows Phone' && os !== 'Android' && os !== 'iOS' && os !== 'Other') {
        return true
      }

        // We compare oscpu with the OS extracted from the UA
      if (typeof oscpu !== 'undefined') {
        oscpu = oscpu.toLowerCase()
        if (oscpu.indexOf('win') >= 0 && os !== 'Windows' && os !== 'Windows Phone') {
          return true
        } else if (oscpu.indexOf('linux') >= 0 && os !== 'Linux' && os !== 'Android') {
          return true
        } else if (oscpu.indexOf('mac') >= 0 && os !== 'Mac' && os !== 'iOS') {
          return true
        } else if ((oscpu.indexOf('win') === -1 && oscpu.indexOf('linux') === -1 && oscpu.indexOf('mac') === -1) !== (os === 'Other')) {
          return true
        }
      }

        // We compare platform with the OS extracted from the UA
      if (platform.indexOf('win') >= 0 && os !== 'Windows' && os !== 'Windows Phone') {
        return true
      } else if ((platform.indexOf('linux') >= 0 || platform.indexOf('android') >= 0 || platform.indexOf('pike') >= 0) && os !== 'Linux' && os !== 'Android') {
        return true
      } else if ((platform.indexOf('mac') >= 0 || platform.indexOf('ipad') >= 0 || platform.indexOf('ipod') >= 0 || platform.indexOf('iphone') >= 0) && os !== 'Mac' && os !== 'iOS') {
        return true
      } else if ((platform.indexOf('win') === -1 && platform.indexOf('linux') === -1 && platform.indexOf('mac') === -1) !== (os === 'Other')) {
        return true
      }

      return typeof navigator.plugins === 'undefined' && os !== 'Windows' && os !== 'Windows Phone'
    }
    var getHasLiedBrowser = function () {
      var userAgent = navigator.userAgent.toLowerCase()
      var productSub = navigator.productSub

        // we extract the browser from the user agent (respect the order of the tests)
      var browser
      if (userAgent.indexOf('firefox') >= 0) {
        browser = 'Firefox'
      } else if (userAgent.indexOf('opera') >= 0 || userAgent.indexOf('opr') >= 0) {
        browser = 'Opera'
      } else if (userAgent.indexOf('chrome') >= 0) {
        browser = 'Chrome'
      } else if (userAgent.indexOf('safari') >= 0) {
        browser = 'Safari'
      } else if (userAgent.indexOf('trident') >= 0) {
        browser = 'Internet Explorer'
      } else {
        browser = 'Other'
      }

      if ((browser === 'Chrome' || browser === 'Safari' || browser === 'Opera') && productSub !== '20030107') {
        return true
      }

        // eslint-disable-next-line no-eval
      var tempRes = eval.toString().length
      if (tempRes === 37 && browser !== 'Safari' && browser !== 'Firefox' && browser !== 'Other') {
        return true
      } else if (tempRes === 39 && browser !== 'Internet Explorer' && browser !== 'Other') {
        return true
      } else if (tempRes === 33 && browser !== 'Chrome' && browser !== 'Opera' && browser !== 'Other') {
        return true
      }

        // We create an error to see how it is handled
      var errFirefox
      try {
          // eslint-disable-next-line no-throw-literal
        throw 'a'
      } catch (err) {
        try {
          err.toSource()
          errFirefox = true
        } catch (errOfErr) {
          errFirefox = false
        }
      }
      return errFirefox && browser !== 'Firefox' && browser !== 'Other'
    }
    var isCanvasSupported = function () {
      var elem = document.createElement('canvas')
      return !!(elem.getContext && elem.getContext('2d'))
    }
    var isWebGlSupported = function () {
        // code taken from Modernizr
      if (!isCanvasSupported()) {
        return false
      }

      var glContext = getWebglCanvas()
      return !!window.WebGLRenderingContext && !!glContext
    }
    var isIE = function () {
      if (navigator.appName === 'Microsoft Internet Explorer') {
        return true
      } else if (navigator.appName === 'Netscape' && /Trident/.test(navigator.userAgent)) { // IE 11
        return true
      }
      return false
    }
    var hasSwfObjectLoaded = function () {
      return typeof window.swfobject !== 'undefined'
    }
    var hasMinFlashInstalled = function () {
      return window.swfobject.hasFlashPlayerVersion('9.0.0')
    }
    var addFlashDivNode = function (options) {
      var node = document.createElement('div')
      node.setAttribute('id', options.fonts.swfContainerId)
      document.body.appendChild(node)
    }
    var loadSwfAndDetectFonts = function (done, options) {
      var hiddenCallback = '___fp_swf_loaded'
      window[hiddenCallback] = function (fonts) {
        done(fonts)
      }
      var id = options.fonts.swfContainerId
      addFlashDivNode()
      var flashvars = { onReady: hiddenCallback }
      var flashparams = { allowScriptAccess: 'always', menu: 'false' }
      window.swfobject.embedSWF(options.fonts.swfPath, id, '1', '1', '9.0.0', false, flashvars, flashparams, {})
    }
    var getWebglCanvas = function () {
      var canvas = document.createElement('canvas')
      var gl = null
      try {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      } catch (e) { /* squelch */ }
      if (!gl) { gl = null }
      return gl
    }

    var components = [
      {key: 'userAgent', getData: UserAgent},
      {key: 'language', getData: languageKey},
      {key: 'colorDepth', getData: colorDepthKey},
      {key: 'deviceMemory', getData: deviceMemoryKey},
      {key: 'pixelRatio', getData: pixelRatioKey},
      {key: 'hardwareConcurrency', getData: hardwareConcurrencyKey},
      {key: 'screenResolution', getData: screenResolutionKey},
      {key: 'availableScreenResolution', getData: availableScreenResolutionKey},
      {key: 'timezoneOffset', getData: timezoneOffset},
      {key: 'timezone', getData: timezone},
      {key: 'sessionStorage', getData: sessionStorageKey},
      {key: 'localStorage', getData: localStorageKey},
      {key: 'indexedDb', getData: indexedDbKey},
      {key: 'addBehavior', getData: addBehaviorKey},
      {key: 'openDatabase', getData: openDatabaseKey},
      {key: 'cpuClass', getData: cpuClassKey},
      {key: 'platform', getData: platformKey},
      {key: 'doNotTrack', getData: doNotTrackKey},
      {key: 'plugins', getData: pluginsComponent},
      {key: 'canvas', getData: canvasKey},
      {key: 'webgl', getData: webglKey},
      {key: 'webglVendorAndRenderer', getData: webglVendorAndRendererKey},
      {key: 'adBlock', getData: adBlockKey},
      {key: 'hasLiedLanguages', getData: hasLiedLanguagesKey},
      {key: 'hasLiedResolution', getData: hasLiedResolutionKey},
      {key: 'hasLiedOs', getData: hasLiedOsKey},
      {key: 'hasLiedBrowser', getData: hasLiedBrowserKey},
      {key: 'touchSupport', getData: touchSupportKey},
      {key: 'fonts', getData: jsFontsKey, pauseBefore: true},
      {key: 'fontsFlash', getData: flashFontsKey, pauseBefore: true},
      {key: 'audio', getData: audioKey},
      {key: 'enumerateDevices', getData: enumerateDevicesKey}
    ]

    var Fingerprint2 = function (options) {
      throw new Error("'new Fingerprint()' is deprecated, see https://github.com/Valve/fingerprintjs2#upgrade-guide-from-182-to-200")
    }

    Fingerprint2.get = function (options, callback) {
      if (!callback) {
        callback = options
        options = {}
      } else if (!options) {
        options = {}
      }
      extendSoft(options, defaultOptions)
      options.components = options.extraComponents.concat(components)

      var keys = {
        data: [],
        addPreprocessedComponent: function (key, value) {
          if (typeof options.preprocessor === 'function') {
            value = options.preprocessor(key, value)
          }
          keys.data.push({key: key, value: value})
        }
      }

      var i = -1
      var chainComponents = function (alreadyWaited) {
        i += 1
        if (i >= options.components.length) { // on finish
          callback(keys.data)
          return
        }
        var component = options.components[i]

        if (options.excludes[component.key]) {
          chainComponents(false) // skip
          return
        }

        if (!alreadyWaited && component.pauseBefore) {
          i -= 1
          setTimeout(function () {
            chainComponents(true)
          }, 1)
          return
        }

        try {
          component.getData(function (value) {
            keys.addPreprocessedComponent(component.key, value)
            chainComponents(false)
          }, options)
        } catch (error) {
          // main body error
          keys.addPreprocessedComponent(component.key, String(error))
          chainComponents(false)
        }
      }

      chainComponents(false)
    }

    Fingerprint2.getPromise = function (options) {
      return new Promise(function (resolve, reject) {
        Fingerprint2.get(options, resolve)
      })
    }

    Fingerprint2.getV18 = function (options, callback) {
      if (callback == null) {
        callback = options
        options = {}
      }
      return Fingerprint2.get(options, function (components) {
        var newComponents = []
        for (var i = 0; i < components.length; i++) {
          var component = components[i]
          if (component.value === (options.NOT_AVAILABLE || 'not available')) {
            newComponents.push({key: component.key, value: 'unknown'})
          } else if (component.key === 'plugins') {
            newComponents.push({key: 'plugins',
              value: map(component.value, function (p) {
                var mimeTypes = map(p[2], function (mt) {
                  if (mt.join) { return mt.join('~') }
                  return mt
                }).join(',')
                return [p[0], p[1], mimeTypes].join('::')
              })})
          } else if (['canvas', 'webgl'].indexOf(component.key) !== -1) {
            newComponents.push({key: component.key, value: component.value.join('~')})
          } else if (['sessionStorage', 'localStorage', 'indexedDb', 'addBehavior', 'openDatabase'].indexOf(component.key) !== -1) {
            if (component.value) {
              newComponents.push({key: component.key, value: 1})
            } else {
              // skip
              continue
            }
          } else {
            if (component.value) {
              newComponents.push(component.value.join ? {key: component.key, value: component.value.join(';')} : component)
            } else {
              newComponents.push({key: component.key, value: component.value})
            }
          }
        }
        var murmur = x64hash128(map(newComponents, function (component) { return component.value }).join('~~~'), 31)
        callback(murmur, newComponents)
      })
    }

    Fingerprint2.x64hash128 = x64hash128
    Fingerprint2.VERSION = '2.0.0'
    return Fingerprint2
  })

  var RSAKey = (function(){
    // prng4.js - uses Arcfour as a PRNG
    function Arcfour() {
      this.i = 0;
      this.j = 0;
      this.S = new Array();
    }

    // Initialize arcfour context from key, an array of ints, each from [0..255]
    function ARC4init(key) {
      var i, j, t;
      for(i = 0; i < 256; ++i)
        this.S[i] = i;
      j = 0;
      for(i = 0; i < 256; ++i) {
        j = (j + this.S[i] + key[i % key.length]) & 255;
        t = this.S[i];
        this.S[i] = this.S[j];
        this.S[j] = t;
      }
      this.i = 0;
      this.j = 0;
    }

    function ARC4next() {
      var t;
      this.i = (this.i + 1) & 255;
      this.j = (this.j + this.S[this.i]) & 255;
      t = this.S[this.i];
      this.S[this.i] = this.S[this.j];
      this.S[this.j] = t;
      return this.S[(t + this.S[this.i]) & 255];
    }

    Arcfour.prototype.init = ARC4init;
    Arcfour.prototype.next = ARC4next;

    // Plug in your RNG constructor here
    function prng_newstate() {
      return new Arcfour();
    }

    // Pool size must be a multiple of 4 and greater than 32.
    // An array of bytes the size of the pool will be passed to init()
    var rng_psize = 256;

    // Random number generator - requires a PRNG backend, e.g. prng4.js

    // For best results, put code like
    // <body onClick='rng_seed_time();' onKeyPress='rng_seed_time();'>
    // in your main HTML document.

    var rng_state;
    var rng_pool;
    var rng_pptr;

    // Mix in a 32-bit integer into the pool
    function rng_seed_int(x) {
      rng_pool[rng_pptr++] ^= x & 255;
      rng_pool[rng_pptr++] ^= (x >> 8) & 255;
      rng_pool[rng_pptr++] ^= (x >> 16) & 255;
      rng_pool[rng_pptr++] ^= (x >> 24) & 255;
      if(rng_pptr >= rng_psize) rng_pptr -= rng_psize;
    }

    // Mix in the current time (w/milliseconds) into the pool
    function rng_seed_time() {
      rng_seed_int(new Date().getTime());
    }

    // Initialize the pool with junk if needed.
    if(rng_pool == null) {
      rng_pool = new Array();
      rng_pptr = 0;
      var t;
      if(typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        // Use webcrypto if available
        var ua = new Uint8Array(32);
        window.crypto.getRandomValues(ua);
        for(t = 0; t < 32; ++t)
          rng_pool[rng_pptr++] = ua[t];
      }
      if(typeof navigator !== 'undefined' && navigator.appName == "Netscape" && navigator.appVersion < "5" && window.crypto && window.crypto.random) {
        // Extract entropy (256 bits) from NS4 RNG if available
        var z = window.crypto.random(32);
        for(t = 0; t < z.length; ++t)
          rng_pool[rng_pptr++] = z.charCodeAt(t) & 255;
      }
      while(rng_pptr < rng_psize) {  // extract some randomness from Math.random()
        t = Math.floor(65536 * Math.random());
        rng_pool[rng_pptr++] = t >>> 8;
        rng_pool[rng_pptr++] = t & 255;
      }
      rng_pptr = 0;
      rng_seed_time();
      //rng_seed_int(window.screenX);
      //rng_seed_int(window.screenY);
    }

    function rng_get_byte() {
      if(rng_state == null) {
        rng_seed_time();
        rng_state = prng_newstate();
        rng_state.init(rng_pool);
        for(rng_pptr = 0; rng_pptr < rng_pool.length; ++rng_pptr)
          rng_pool[rng_pptr] = 0;
        rng_pptr = 0;
        //rng_pool = null;
      }
      // TODO: allow reseeding after first request
      return rng_state.next();
    }

    function rng_get_bytes(ba) {
      var i;
      for(i = 0; i < ba.length; ++i) ba[i] = rng_get_byte();
    }

    function SecureRandom() {}

    SecureRandom.prototype.nextBytes = rng_get_bytes;

    // Copyright (c) 2005  Tom Wu
    // All Rights Reserved.
    // See "LICENSE" for details.

    // Basic JavaScript BN library - subset useful for RSA encryption.

    // Bits per digit
    var dbits;

    // JavaScript engine analysis
    var canary = 0xdeadbeefcafe;
    var j_lm = ((canary&0xffffff)==0xefcafe);

    // (public) Constructor
    function BigInteger(a,b,c) {
      if(a != null)
        if("number" == typeof a) this.fromNumber(a,b,c);
        else if(b == null && "string" != typeof a) this.fromString(a,256);
        else this.fromString(a,b);
    }

    // return new, unset BigInteger
    function nbi() { return new BigInteger(null); }

    // am: Compute w_j += (x*this_i), propagate carries,
    // c is initial carry, returns final carry.
    // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
    // We need to select the fastest one that works in this environment.

    // am1: use a single mult and divide to get the high bits,
    // max digit bits should be 26 because
    // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
    function am1(i,x,w,j,c,n) {
      while(--n >= 0) {
        var v = x*this[i++]+w[j]+c;
        c = Math.floor(v/0x4000000);
        w[j++] = v&0x3ffffff;
      }
      return c;
    }
    // am2 avoids a big mult-and-extract completely.
    // Max digit bits should be <= 30 because we do bitwise ops
    // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
    function am2(i,x,w,j,c,n) {
      var xl = x&0x7fff, xh = x>>15;
      while(--n >= 0) {
        var l = this[i]&0x7fff;
        var h = this[i++]>>15;
        var m = xh*l+h*xl;
        l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
        c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
        w[j++] = l&0x3fffffff;
      }
      return c;
    }
    // Alternately, set max digit bits to 28 since some
    // browsers slow down when dealing with 32-bit numbers.
    function am3(i,x,w,j,c,n) {
      var xl = x&0x3fff, xh = x>>14;
      while(--n >= 0) {
        var l = this[i]&0x3fff;
        var h = this[i++]>>14;
        var m = xh*l+h*xl;
        l = xl*l+((m&0x3fff)<<14)+w[j]+c;
        c = (l>>28)+(m>>14)+xh*h;
        w[j++] = l&0xfffffff;
      }
      return c;
    }
    if(j_lm && (typeof navigator !== 'undefined' && navigator.appName == "Microsoft Internet Explorer")) {
      BigInteger.prototype.am = am2;
      dbits = 30;
    }
    else if(j_lm && (typeof navigator !== 'undefined' && navigator.appName != "Netscape")) {
      BigInteger.prototype.am = am1;
      dbits = 26;
    }
    else { // Mozilla/Netscape seems to prefer am3
      BigInteger.prototype.am = am3;
      dbits = 28;
    }

    BigInteger.prototype.DB = dbits;
    BigInteger.prototype.DM = ((1<<dbits)-1);
    BigInteger.prototype.DV = (1<<dbits);

    var BI_FP = 52;
    BigInteger.prototype.FV = Math.pow(2,BI_FP);
    BigInteger.prototype.F1 = BI_FP-dbits;
    BigInteger.prototype.F2 = 2*dbits-BI_FP;

    // Digit conversions
    var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
    var BI_RC = new Array();
    var rr,vv;
    rr = "0".charCodeAt(0);
    for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
    rr = "a".charCodeAt(0);
    for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
    rr = "A".charCodeAt(0);
    for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

    function int2char(n) { return BI_RM.charAt(n); }
    function intAt(s,i) {
      var c = BI_RC[s.charCodeAt(i)];
      return (c==null)?-1:c;
    }

    // (protected) copy this to r
    function bnpCopyTo(r) {
      for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
      r.t = this.t;
      r.s = this.s;
    }

    // (protected) set from integer value x, -DV <= x < DV
    function bnpFromInt(x) {
      this.t = 1;
      this.s = (x<0)?-1:0;
      if(x > 0) this[0] = x;
      else if(x < -1) this[0] = x+this.DV;
      else this.t = 0;
    }

    // return bigint initialized to value
    function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

    // (protected) set from string and radix
    function bnpFromString(s,b) {
      var k;
      if(b == 16) k = 4;
      else if(b == 8) k = 3;
      else if(b == 256) k = 8; // byte array
      else if(b == 2) k = 1;
      else if(b == 32) k = 5;
      else if(b == 4) k = 2;
      else { this.fromRadix(s,b); return; }
      this.t = 0;
      this.s = 0;
      var i = s.length, mi = false, sh = 0;
      while(--i >= 0) {
        var x = (k==8)?s[i]&0xff:intAt(s,i);
        if(x < 0) {
          if(s.charAt(i) == "-") mi = true;
          continue;
        }
        mi = false;
        if(sh == 0)
          this[this.t++] = x;
        else if(sh+k > this.DB) {
          this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
          this[this.t++] = (x>>(this.DB-sh));
        }
        else
          this[this.t-1] |= x<<sh;
        sh += k;
        if(sh >= this.DB) sh -= this.DB;
      }
      if(k == 8 && (s[0]&0x80) != 0) {
        this.s = -1;
        if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
      }
      this.clamp();
      if(mi) BigInteger.ZERO.subTo(this,this);
    }

    // (protected) clamp off excess high words
    function bnpClamp() {
      var c = this.s&this.DM;
      while(this.t > 0 && this[this.t-1] == c) --this.t;
    }

    // (public) return string representation in given radix
    function bnToString(b) {
      if(this.s < 0) return "-"+this.negate().toString(b);
      var k;
      if(b == 16) k = 4;
      else if(b == 8) k = 3;
      else if(b == 2) k = 1;
      else if(b == 32) k = 5;
      else if(b == 4) k = 2;
      else return this.toRadix(b);
      var km = (1<<k)-1, d, m = false, r = "", i = this.t;
      var p = this.DB-(i*this.DB)%k;
      if(i-- > 0) {
        if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
        while(i >= 0) {
          if(p < k) {
            d = (this[i]&((1<<p)-1))<<(k-p);
            d |= this[--i]>>(p+=this.DB-k);
          }
          else {
            d = (this[i]>>(p-=k))&km;
            if(p <= 0) { p += this.DB; --i; }
          }
          if(d > 0) m = true;
          if(m) r += int2char(d);
        }
      }
      return m?r:"0";
    }

    // (public) -this
    function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

    // (public) |this|
    function bnAbs() { return (this.s<0)?this.negate():this; }

    // (public) return + if this > a, - if this < a, 0 if equal
    function bnCompareTo(a) {
      var r = this.s-a.s;
      if(r != 0) return r;
      var i = this.t;
      r = i-a.t;
      if(r != 0) return (this.s<0)?-r:r;
      while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
      return 0;
    }

    // returns bit length of the integer x
    function nbits(x) {
      var r = 1, t;
      if((t=x>>>16) != 0) { x = t; r += 16; }
      if((t=x>>8) != 0) { x = t; r += 8; }
      if((t=x>>4) != 0) { x = t; r += 4; }
      if((t=x>>2) != 0) { x = t; r += 2; }
      if((t=x>>1) != 0) { x = t; r += 1; }
      return r;
    }

    // (public) return the number of bits in "this"
    function bnBitLength() {
      if(this.t <= 0) return 0;
      return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
    }

    // (protected) r = this << n*DB
    function bnpDLShiftTo(n,r) {
      var i;
      for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
      for(i = n-1; i >= 0; --i) r[i] = 0;
      r.t = this.t+n;
      r.s = this.s;
    }

    // (protected) r = this >> n*DB
    function bnpDRShiftTo(n,r) {
      for(var i = n; i < this.t; ++i) r[i-n] = this[i];
      r.t = Math.max(this.t-n,0);
      r.s = this.s;
    }

    // (protected) r = this << n
    function bnpLShiftTo(n,r) {
      var bs = n%this.DB;
      var cbs = this.DB-bs;
      var bm = (1<<cbs)-1;
      var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
      for(i = this.t-1; i >= 0; --i) {
        r[i+ds+1] = (this[i]>>cbs)|c;
        c = (this[i]&bm)<<bs;
      }
      for(i = ds-1; i >= 0; --i) r[i] = 0;
      r[ds] = c;
      r.t = this.t+ds+1;
      r.s = this.s;
      r.clamp();
    }

    // (protected) r = this >> n
    function bnpRShiftTo(n,r) {
      r.s = this.s;
      var ds = Math.floor(n/this.DB);
      if(ds >= this.t) { r.t = 0; return; }
      var bs = n%this.DB;
      var cbs = this.DB-bs;
      var bm = (1<<bs)-1;
      r[0] = this[ds]>>bs;
      for(var i = ds+1; i < this.t; ++i) {
        r[i-ds-1] |= (this[i]&bm)<<cbs;
        r[i-ds] = this[i]>>bs;
      }
      if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
      r.t = this.t-ds;
      r.clamp();
    }

    // (protected) r = this - a
    function bnpSubTo(a,r) {
      var i = 0, c = 0, m = Math.min(a.t,this.t);
      while(i < m) {
        c += this[i]-a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      if(a.t < this.t) {
        c -= a.s;
        while(i < this.t) {
          c += this[i];
          r[i++] = c&this.DM;
          c >>= this.DB;
        }
        c += this.s;
      }
      else {
        c += this.s;
        while(i < a.t) {
          c -= a[i];
          r[i++] = c&this.DM;
          c >>= this.DB;
        }
        c -= a.s;
      }
      r.s = (c<0)?-1:0;
      if(c < -1) r[i++] = this.DV+c;
      else if(c > 0) r[i++] = c;
      r.t = i;
      r.clamp();
    }

    // (protected) r = this * a, r != this,a (HAC 14.12)
    // "this" should be the larger one if appropriate.
    function bnpMultiplyTo(a,r) {
      var x = this.abs(), y = a.abs();
      var i = x.t;
      r.t = i+y.t;
      while(--i >= 0) r[i] = 0;
      for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
      r.s = 0;
      r.clamp();
      if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
    }

    // (protected) r = this^2, r != this (HAC 14.16)
    function bnpSquareTo(r) {
      var x = this.abs();
      var i = r.t = 2*x.t;
      while(--i >= 0) r[i] = 0;
      for(i = 0; i < x.t-1; ++i) {
        var c = x.am(i,x[i],r,2*i,0,1);
        if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
          r[i+x.t] -= x.DV;
          r[i+x.t+1] = 1;
        }
      }
      if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
      r.s = 0;
      r.clamp();
    }

    // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
    // r != q, this != m.  q or r may be null.
    function bnpDivRemTo(m,q,r) {
      var pm = m.abs();
      if(pm.t <= 0) return;
      var pt = this.abs();
      if(pt.t < pm.t) {
        if(q != null) q.fromInt(0);
        if(r != null) this.copyTo(r);
        return;
      }
      if(r == null) r = nbi();
      var y = nbi(), ts = this.s, ms = m.s;
      var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
      if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
      else { pm.copyTo(y); pt.copyTo(r); }
      var ys = y.t;
      var y0 = y[ys-1];
      if(y0 == 0) return;
      var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
      var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
      var i = r.t, j = i-ys, t = (q==null)?nbi():q;
      y.dlShiftTo(j,t);
      if(r.compareTo(t) >= 0) {
        r[r.t++] = 1;
        r.subTo(t,r);
      }
      BigInteger.ONE.dlShiftTo(ys,t);
      t.subTo(y,y);	// "negative" y so we can replace sub with am later
      while(y.t < ys) y[y.t++] = 0;
      while(--j >= 0) {
        // Estimate quotient digit
        var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
        if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
          y.dlShiftTo(j,t);
          r.subTo(t,r);
          while(r[i] < --qd) r.subTo(t,r);
        }
      }
      if(q != null) {
        r.drShiftTo(ys,q);
        if(ts != ms) BigInteger.ZERO.subTo(q,q);
      }
      r.t = ys;
      r.clamp();
      if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
      if(ts < 0) BigInteger.ZERO.subTo(r,r);
    }

    // (public) this mod a
    function bnMod(a) {
      var r = nbi();
      this.abs().divRemTo(a,null,r);
      if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
      return r;
    }

    // Modular reduction using "classic" algorithm
    function Classic(m) { this.m = m; }
    function cConvert(x) {
      if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
      else return x;
    }
    function cRevert(x) { return x; }
    function cReduce(x) { x.divRemTo(this.m,null,x); }
    function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
    function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

    Classic.prototype.convert = cConvert;
    Classic.prototype.revert = cRevert;
    Classic.prototype.reduce = cReduce;
    Classic.prototype.mulTo = cMulTo;
    Classic.prototype.sqrTo = cSqrTo;

    // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
    // justification:
    //         xy == 1 (mod m)
    //         xy =  1+km
    //   xy(2-xy) = (1+km)(1-km)
    // x[y(2-xy)] = 1-k^2m^2
    // x[y(2-xy)] == 1 (mod m^2)
    // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
    // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
    // JS multiply "overflows" differently from C/C++, so care is needed here.
    function bnpInvDigit() {
      if(this.t < 1) return 0;
      var x = this[0];
      if((x&1) == 0) return 0;
      var y = x&3;		// y == 1/x mod 2^2
      y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
      y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
      y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
      // last step - calculate inverse mod DV directly;
      // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
      y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
      // we really want the negative inverse, and -DV < y < DV
      return (y>0)?this.DV-y:-y;
    }

    // Montgomery reduction
    function Montgomery(m) {
      this.m = m;
      this.mp = m.invDigit();
      this.mpl = this.mp&0x7fff;
      this.mph = this.mp>>15;
      this.um = (1<<(m.DB-15))-1;
      this.mt2 = 2*m.t;
    }

    // xR mod m
    function montConvert(x) {
      var r = nbi();
      x.abs().dlShiftTo(this.m.t,r);
      r.divRemTo(this.m,null,r);
      if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
      return r;
    }

    // x/R mod m
    function montRevert(x) {
      var r = nbi();
      x.copyTo(r);
      this.reduce(r);
      return r;
    }

    // x = x/R mod m (HAC 14.32)
    function montReduce(x) {
      while(x.t <= this.mt2)	// pad x so am has enough room later
        x[x.t++] = 0;
      for(var i = 0; i < this.m.t; ++i) {
        // faster way of calculating u0 = x[i]*mp mod DV
        var j = x[i]&0x7fff;
        var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
        // use am to combine the multiply-shift-add into one call
        j = i+this.m.t;
        x[j] += this.m.am(0,u0,x,i,0,this.m.t);
        // propagate carry
        while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
      }
      x.clamp();
      x.drShiftTo(this.m.t,x);
      if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
    }

    // r = "x^2/R mod m"; x != r
    function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

    // r = "xy/R mod m"; x,y != r
    function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

    Montgomery.prototype.convert = montConvert;
    Montgomery.prototype.revert = montRevert;
    Montgomery.prototype.reduce = montReduce;
    Montgomery.prototype.mulTo = montMulTo;
    Montgomery.prototype.sqrTo = montSqrTo;

    // (protected) true iff this is even
    function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

    // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
    function bnpExp(e,z) {
      if(e > 0xffffffff || e < 1) return BigInteger.ONE;
      var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
      g.copyTo(r);
      while(--i >= 0) {
        z.sqrTo(r,r2);
        if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
        else { var t = r; r = r2; r2 = t; }
      }
      return z.revert(r);
    }

    // (public) this^e % m, 0 <= e < 2^32
    function bnModPowInt(e,m) {
      var z;
      if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
      return this.exp(e,z);
    }

    // protected
    BigInteger.prototype.copyTo = bnpCopyTo;
    BigInteger.prototype.fromInt = bnpFromInt;
    BigInteger.prototype.fromString = bnpFromString;
    BigInteger.prototype.clamp = bnpClamp;
    BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
    BigInteger.prototype.drShiftTo = bnpDRShiftTo;
    BigInteger.prototype.lShiftTo = bnpLShiftTo;
    BigInteger.prototype.rShiftTo = bnpRShiftTo;
    BigInteger.prototype.subTo = bnpSubTo;
    BigInteger.prototype.multiplyTo = bnpMultiplyTo;
    BigInteger.prototype.squareTo = bnpSquareTo;
    BigInteger.prototype.divRemTo = bnpDivRemTo;
    BigInteger.prototype.invDigit = bnpInvDigit;
    BigInteger.prototype.isEven = bnpIsEven;
    BigInteger.prototype.exp = bnpExp;

    // public
    BigInteger.prototype.toString = bnToString;
    BigInteger.prototype.negate = bnNegate;
    BigInteger.prototype.abs = bnAbs;
    BigInteger.prototype.compareTo = bnCompareTo;
    BigInteger.prototype.bitLength = bnBitLength;
    BigInteger.prototype.mod = bnMod;
    BigInteger.prototype.modPowInt = bnModPowInt;

    // "constants"
    BigInteger.ZERO = nbv(0);
    BigInteger.ONE = nbv(1);

    // rsa.js
    // Modified: alerts have been removed!

    // Depends on jsbn.js and rng.js
    // Version 1.1: support utf-8 encoding in pkcs1pad2

    // convert a (hex) string to a bignum object
    function parseBigInt(str,r) {
      return new BigInteger(str,r);
    }

    // PKCS#1 (type 2, random) pad input string s to n bytes, and return a bigint
    function pkcs1pad2(s,n) {
      if(n < s.length + 11) { // TODO: fix for utf-8
        return null;
      }
      var ba = new Array();
      var i = s.length - 1;
      while(i >= 0 && n > 0) {
        var c = s.charCodeAt(i--);
        if(c < 128) { // encode using utf-8
          ba[--n] = c;
        }
        else if((c > 127) && (c < 2048)) {
          ba[--n] = (c & 63) | 128;
          ba[--n] = (c >> 6) | 192;
        }
        else {
          ba[--n] = (c & 63) | 128;
          ba[--n] = ((c >> 6) & 63) | 128;
          ba[--n] = (c >> 12) | 224;
        }
      }
      ba[--n] = 0;
      var rng = new SecureRandom();
      var x = new Array();
      while(n > 2) { // random non-zero pad
        x[0] = 0;
        while(x[0] == 0) rng.nextBytes(x);
        ba[--n] = x[0];
      }
      ba[--n] = 2;
      ba[--n] = 0;
      return new BigInteger(ba);
    }

    // "empty" RSA key constructor
    function RSAKey() {
      this.n = null;
      this.e = 0;
      this.d = null;
      this.p = null;
      this.q = null;
      this.dmp1 = null;
      this.dmq1 = null;
      this.coeff = null;
    }

    // Set the public key fields N and e from hex strings
    function RSASetPublic(N,E) {
      if(N != null && E != null && N.length > 0 && E.length > 0) {
        this.n = parseBigInt(N,16);
        this.e = parseInt(E,16);
      }
    }

    // Perform raw public operation on "x": return x^e (mod n)
    function RSADoPublic(x) {
      return x.modPowInt(this.e, this.n);
    }

    // Return the PKCS#1 RSA encryption of "text" as an even-length hex string
    function RSAEncrypt(text) {
      var m = pkcs1pad2(text,(this.n.bitLength()+7)>>3);
      if(m == null) return null;
      var c = this.doPublic(m);
      if(c == null) return null;
      var h = c.toString(16);
      if((h.length & 1) == 0) return h; else return "0" + h;
    }

    // protected
    RSAKey.prototype.doPublic = RSADoPublic;

    // public
    RSAKey.prototype.setPublic = RSASetPublic;
    RSAKey.prototype.encrypt = RSAEncrypt;

    return RSAKey;
  })();

  // sjcl.js
  //
  // https://github.com/bitwiseshiftleft/sjcl/blob/master/sjcl.js
  // ec1162f7ce686e489c471d1d13772ebfda35623b
  var sjcl={cipher:{},hash:{},keyexchange:{},mode:{},misc:{},codec:{},exception:{corrupt:function(a){this.toString=function(){return"CORRUPT: "+this.message};this.message=a},invalid:function(a){this.toString=function(){return"INVALID: "+this.message};this.message=a},bug:function(a){this.toString=function(){return"BUG: "+this.message};this.message=a},notReady:function(a){this.toString=function(){return"NOT READY: "+this.message};this.message=a}}};
  sjcl.cipher.aes=function(a){this.s[0][0][0]||this.O();var b,c,d,e,f=this.s[0][4],g=this.s[1];b=a.length;var h=1;if(4!==b&&6!==b&&8!==b)throw new sjcl.exception.invalid("invalid aes key size");this.b=[d=a.slice(0),e=[]];for(a=b;a<4*b+28;a++){c=d[a-1];if(0===a%b||8===b&&4===a%b)c=f[c>>>24]<<24^f[c>>16&255]<<16^f[c>>8&255]<<8^f[c&255],0===a%b&&(c=c<<8^c>>>24^h<<24,h=h<<1^283*(h>>7));d[a]=d[a-b]^c}for(b=0;a;b++,a--)c=d[b&3?a:a-4],e[b]=4>=a||4>b?c:g[0][f[c>>>24]]^g[1][f[c>>16&255]]^g[2][f[c>>8&255]]^g[3][f[c&
  255]]};
  sjcl.cipher.aes.prototype={encrypt:function(a){return t(this,a,0)},decrypt:function(a){return t(this,a,1)},s:[[[],[],[],[],[]],[[],[],[],[],[]]],O:function(){var a=this.s[0],b=this.s[1],c=a[4],d=b[4],e,f,g,h=[],k=[],l,n,m,p;for(e=0;0x100>e;e++)k[(h[e]=e<<1^283*(e>>7))^e]=e;for(f=g=0;!c[f];f^=l||1,g=k[g]||1)for(m=g^g<<1^g<<2^g<<3^g<<4,m=m>>8^m&255^99,c[f]=m,d[m]=f,n=h[e=h[l=h[f]]],p=0x1010101*n^0x10001*e^0x101*l^0x1010100*f,n=0x101*h[m]^0x1010100*m,e=0;4>e;e++)a[e][f]=n=n<<24^n>>>8,b[e][m]=p=p<<24^p>>>8;for(e=
  0;5>e;e++)a[e]=a[e].slice(0),b[e]=b[e].slice(0)}};
  function t(a,b,c){if(4!==b.length)throw new sjcl.exception.invalid("invalid aes block size");var d=a.b[c],e=b[0]^d[0],f=b[c?3:1]^d[1],g=b[2]^d[2];b=b[c?1:3]^d[3];var h,k,l,n=d.length/4-2,m,p=4,r=[0,0,0,0];h=a.s[c];a=h[0];var q=h[1],v=h[2],w=h[3],x=h[4];for(m=0;m<n;m++)h=a[e>>>24]^q[f>>16&255]^v[g>>8&255]^w[b&255]^d[p],k=a[f>>>24]^q[g>>16&255]^v[b>>8&255]^w[e&255]^d[p+1],l=a[g>>>24]^q[b>>16&255]^v[e>>8&255]^w[f&255]^d[p+2],b=a[b>>>24]^q[e>>16&255]^v[f>>8&255]^w[g&255]^d[p+3],p+=4,e=h,f=k,g=l;for(m=
  0;4>m;m++)r[c?3&-m:m]=x[e>>>24]<<24^x[f>>16&255]<<16^x[g>>8&255]<<8^x[b&255]^d[p++],h=e,e=f,f=g,g=b,b=h;return r}
  sjcl.bitArray={bitSlice:function(a,b,c){a=sjcl.bitArray.$(a.slice(b/32),32-(b&31)).slice(1);return void 0===c?a:sjcl.bitArray.clamp(a,c-b)},extract:function(a,b,c){var d=Math.floor(-b-c&31);return((b+c-1^b)&-32?a[b/32|0]<<32-d^a[b/32+1|0]>>>d:a[b/32|0]>>>d)&(1<<c)-1},concat:function(a,b){if(0===a.length||0===b.length)return a.concat(b);var c=a[a.length-1],d=sjcl.bitArray.getPartial(c);return 32===d?a.concat(b):sjcl.bitArray.$(b,d,c|0,a.slice(0,a.length-1))},bitLength:function(a){var b=a.length;return 0===
  b?0:32*(b-1)+sjcl.bitArray.getPartial(a[b-1])},clamp:function(a,b){if(32*a.length<b)return a;a=a.slice(0,Math.ceil(b/32));var c=a.length;b=b&31;0<c&&b&&(a[c-1]=sjcl.bitArray.partial(b,a[c-1]&2147483648>>b-1,1));return a},partial:function(a,b,c){return 32===a?b:(c?b|0:b<<32-a)+0x10000000000*a},getPartial:function(a){return Math.round(a/0x10000000000)||32},equal:function(a,b){if(sjcl.bitArray.bitLength(a)!==sjcl.bitArray.bitLength(b))return!1;var c=0,d;for(d=0;d<a.length;d++)c|=a[d]^b[d];return 0===
  c},$:function(a,b,c,d){var e;e=0;for(void 0===d&&(d=[]);32<=b;b-=32)d.push(c),c=0;if(0===b)return d.concat(a);for(e=0;e<a.length;e++)d.push(c|a[e]>>>b),c=a[e]<<32-b;e=a.length?a[a.length-1]:0;a=sjcl.bitArray.getPartial(e);d.push(sjcl.bitArray.partial(b+a&31,32<b+a?c:d.pop(),1));return d},i:function(a,b){return[a[0]^b[0],a[1]^b[1],a[2]^b[2],a[3]^b[3]]},byteswapM:function(a){var b,c;for(b=0;b<a.length;++b)c=a[b],a[b]=c>>>24|c>>>8&0xff00|(c&0xff00)<<8|c<<24;return a}};
  sjcl.codec.utf8String={fromBits:function(a){var b="",c=sjcl.bitArray.bitLength(a),d,e;for(d=0;d<c/8;d++)0===(d&3)&&(e=a[d/4]),b+=String.fromCharCode(e>>>8>>>8>>>8),e<<=8;return decodeURIComponent(escape(b))},toBits:function(a){a=unescape(encodeURIComponent(a));var b=[],c,d=0;for(c=0;c<a.length;c++)d=d<<8|a.charCodeAt(c),3===(c&3)&&(b.push(d),d=0);c&3&&b.push(sjcl.bitArray.partial(8*(c&3),d));return b}};
  sjcl.codec.hex={fromBits:function(a){var b="",c;for(c=0;c<a.length;c++)b+=((a[c]|0)+0xf00000000000).toString(16).substr(4);return b.substr(0,sjcl.bitArray.bitLength(a)/4)},toBits:function(a){var b,c=[],d;a=a.replace(/\s|0x/g,"");d=a.length;a=a+"00000000";for(b=0;b<a.length;b+=8)c.push(parseInt(a.substr(b,8),16)^0);return sjcl.bitArray.clamp(c,4*d)}};
  sjcl.codec.base32={B:"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",X:"0123456789ABCDEFGHIJKLMNOPQRSTUV",BITS:32,BASE:5,REMAINING:27,fromBits:function(a,b,c){var d=sjcl.codec.base32.BASE,e=sjcl.codec.base32.REMAINING,f="",g=0,h=sjcl.codec.base32.B,k=0,l=sjcl.bitArray.bitLength(a);c&&(h=sjcl.codec.base32.X);for(c=0;f.length*d<l;)f+=h.charAt((k^a[c]>>>g)>>>e),g<d?(k=a[c]<<d-g,g+=e,c++):(k<<=d,g-=d);for(;f.length&7&&!b;)f+="=";return f},toBits:function(a,b){a=a.replace(/\s|=/g,"").toUpperCase();var c=sjcl.codec.base32.BITS,
  d=sjcl.codec.base32.BASE,e=sjcl.codec.base32.REMAINING,f=[],g,h=0,k=sjcl.codec.base32.B,l=0,n,m="base32";b&&(k=sjcl.codec.base32.X,m="base32hex");for(g=0;g<a.length;g++){n=k.indexOf(a.charAt(g));if(0>n){if(!b)try{return sjcl.codec.base32hex.toBits(a)}catch(p){}throw new sjcl.exception.invalid("this isn't "+m+"!");}h>e?(h-=e,f.push(l^n>>>h),l=n<<c-h):(h+=d,l^=n<<c-h)}h&56&&f.push(sjcl.bitArray.partial(h&56,l,1));return f}};
  sjcl.codec.base32hex={fromBits:function(a,b){return sjcl.codec.base32.fromBits(a,b,1)},toBits:function(a){return sjcl.codec.base32.toBits(a,1)}};
  sjcl.codec.base64={B:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",fromBits:function(a,b,c){var d="",e=0,f=sjcl.codec.base64.B,g=0,h=sjcl.bitArray.bitLength(a);c&&(f=f.substr(0,62)+"-_");for(c=0;6*d.length<h;)d+=f.charAt((g^a[c]>>>e)>>>26),6>e?(g=a[c]<<6-e,e+=26,c++):(g<<=6,e-=6);for(;d.length&3&&!b;)d+="=";return d},toBits:function(a,b){a=a.replace(/\s|=/g,"");var c=[],d,e=0,f=sjcl.codec.base64.B,g=0,h;b&&(f=f.substr(0,62)+"-_");for(d=0;d<a.length;d++){h=f.indexOf(a.charAt(d));
  if(0>h)throw new sjcl.exception.invalid("this isn't base64!");26<e?(e-=26,c.push(g^h>>>e),g=h<<32-e):(e+=6,g^=h<<32-e)}e&56&&c.push(sjcl.bitArray.partial(e&56,g,1));return c}};sjcl.codec.base64url={fromBits:function(a){return sjcl.codec.base64.fromBits(a,1,1)},toBits:function(a){return sjcl.codec.base64.toBits(a,1)}};sjcl.hash.sha256=function(a){this.b[0]||this.O();a?(this.F=a.F.slice(0),this.A=a.A.slice(0),this.l=a.l):this.reset()};sjcl.hash.sha256.hash=function(a){return(new sjcl.hash.sha256).update(a).finalize()};
  sjcl.hash.sha256.prototype={blockSize:512,reset:function(){this.F=this.Y.slice(0);this.A=[];this.l=0;return this},update:function(a){"string"===typeof a&&(a=sjcl.codec.utf8String.toBits(a));var b,c=this.A=sjcl.bitArray.concat(this.A,a);b=this.l;a=this.l=b+sjcl.bitArray.bitLength(a);if(0x1fffffffffffff<a)throw new sjcl.exception.invalid("Cannot hash more than 2^53 - 1 bits");if("undefined"!==typeof Uint32Array){var d=new Uint32Array(c),e=0;for(b=512+b-(512+b&0x1ff);b<=a;b+=512)u(this,d.subarray(16*e,
  16*(e+1))),e+=1;c.splice(0,16*e)}else for(b=512+b-(512+b&0x1ff);b<=a;b+=512)u(this,c.splice(0,16));return this},finalize:function(){var a,b=this.A,c=this.F,b=sjcl.bitArray.concat(b,[sjcl.bitArray.partial(1,1)]);for(a=b.length+2;a&15;a++)b.push(0);b.push(Math.floor(this.l/0x100000000));for(b.push(this.l|0);b.length;)u(this,b.splice(0,16));this.reset();return c},Y:[],b:[],O:function(){function a(a){return 0x100000000*(a-Math.floor(a))|0}for(var b=0,c=2,d,e;64>b;c++){e=!0;for(d=2;d*d<=c;d++)if(0===c%d){e=
  !1;break}e&&(8>b&&(this.Y[b]=a(Math.pow(c,.5))),this.b[b]=a(Math.pow(c,1/3)),b++)}}};
  function u(a,b){var c,d,e,f=a.F,g=a.b,h=f[0],k=f[1],l=f[2],n=f[3],m=f[4],p=f[5],r=f[6],q=f[7];for(c=0;64>c;c++)16>c?d=b[c]:(d=b[c+1&15],e=b[c+14&15],d=b[c&15]=(d>>>7^d>>>18^d>>>3^d<<25^d<<14)+(e>>>17^e>>>19^e>>>10^e<<15^e<<13)+b[c&15]+b[c+9&15]|0),d=d+q+(m>>>6^m>>>11^m>>>25^m<<26^m<<21^m<<7)+(r^m&(p^r))+g[c],q=r,r=p,p=m,m=n+d|0,n=l,l=k,k=h,h=d+(k&l^n&(k^l))+(k>>>2^k>>>13^k>>>22^k<<30^k<<19^k<<10)|0;f[0]=f[0]+h|0;f[1]=f[1]+k|0;f[2]=f[2]+l|0;f[3]=f[3]+n|0;f[4]=f[4]+m|0;f[5]=f[5]+p|0;f[6]=f[6]+r|0;f[7]=
  f[7]+q|0}
  sjcl.mode.ccm={name:"ccm",G:[],listenProgress:function(a){sjcl.mode.ccm.G.push(a)},unListenProgress:function(a){a=sjcl.mode.ccm.G.indexOf(a);-1<a&&sjcl.mode.ccm.G.splice(a,1)},fa:function(a){var b=sjcl.mode.ccm.G.slice(),c;for(c=0;c<b.length;c+=1)b[c](a)},encrypt:function(a,b,c,d,e){var f,g=b.slice(0),h=sjcl.bitArray,k=h.bitLength(c)/8,l=h.bitLength(g)/8;e=e||64;d=d||[];if(7>k)throw new sjcl.exception.invalid("ccm: iv must be at least 7 bytes");for(f=2;4>f&&l>>>8*f;f++);f<15-k&&(f=15-k);c=h.clamp(c,
  8*(15-f));b=sjcl.mode.ccm.V(a,b,c,d,e,f);g=sjcl.mode.ccm.C(a,g,c,b,e,f);return h.concat(g.data,g.tag)},decrypt:function(a,b,c,d,e){e=e||64;d=d||[];var f=sjcl.bitArray,g=f.bitLength(c)/8,h=f.bitLength(b),k=f.clamp(b,h-e),l=f.bitSlice(b,h-e),h=(h-e)/8;if(7>g)throw new sjcl.exception.invalid("ccm: iv must be at least 7 bytes");for(b=2;4>b&&h>>>8*b;b++);b<15-g&&(b=15-g);c=f.clamp(c,8*(15-b));k=sjcl.mode.ccm.C(a,k,c,l,e,b);a=sjcl.mode.ccm.V(a,k.data,c,d,e,b);if(!f.equal(k.tag,a))throw new sjcl.exception.corrupt("ccm: tag doesn't match");
  return k.data},na:function(a,b,c,d,e,f){var g=[],h=sjcl.bitArray,k=h.i;d=[h.partial(8,(b.length?64:0)|d-2<<2|f-1)];d=h.concat(d,c);d[3]|=e;d=a.encrypt(d);if(b.length)for(c=h.bitLength(b)/8,65279>=c?g=[h.partial(16,c)]:0xffffffff>=c&&(g=h.concat([h.partial(16,65534)],[c])),g=h.concat(g,b),b=0;b<g.length;b+=4)d=a.encrypt(k(d,g.slice(b,b+4).concat([0,0,0])));return d},V:function(a,b,c,d,e,f){var g=sjcl.bitArray,h=g.i;e/=8;if(e%2||4>e||16<e)throw new sjcl.exception.invalid("ccm: invalid tag length");
  if(0xffffffff<d.length||0xffffffff<b.length)throw new sjcl.exception.bug("ccm: can't deal with 4GiB or more data");c=sjcl.mode.ccm.na(a,d,c,e,g.bitLength(b)/8,f);for(d=0;d<b.length;d+=4)c=a.encrypt(h(c,b.slice(d,d+4).concat([0,0,0])));return g.clamp(c,8*e)},C:function(a,b,c,d,e,f){var g,h=sjcl.bitArray;g=h.i;var k=b.length,l=h.bitLength(b),n=k/50,m=n;c=h.concat([h.partial(8,f-1)],c).concat([0,0,0]).slice(0,4);d=h.bitSlice(g(d,a.encrypt(c)),0,e);if(!k)return{tag:d,data:[]};for(g=0;g<k;g+=4)g>n&&(sjcl.mode.ccm.fa(g/
  k),n+=m),c[3]++,e=a.encrypt(c),b[g]^=e[0],b[g+1]^=e[1],b[g+2]^=e[2],b[g+3]^=e[3];return{tag:d,data:h.clamp(b,l)}}};
  sjcl.mode.ocb2={name:"ocb2",encrypt:function(a,b,c,d,e,f){if(128!==sjcl.bitArray.bitLength(c))throw new sjcl.exception.invalid("ocb iv must be 128 bits");var g,h=sjcl.mode.ocb2.S,k=sjcl.bitArray,l=k.i,n=[0,0,0,0];c=h(a.encrypt(c));var m,p=[];d=d||[];e=e||64;for(g=0;g+4<b.length;g+=4)m=b.slice(g,g+4),n=l(n,m),p=p.concat(l(c,a.encrypt(l(c,m)))),c=h(c);m=b.slice(g);b=k.bitLength(m);g=a.encrypt(l(c,[0,0,0,b]));m=k.clamp(l(m.concat([0,0,0]),g),b);n=l(n,l(m.concat([0,0,0]),g));n=a.encrypt(l(n,l(c,h(c))));
  d.length&&(n=l(n,f?d:sjcl.mode.ocb2.pmac(a,d)));return p.concat(k.concat(m,k.clamp(n,e)))},decrypt:function(a,b,c,d,e,f){if(128!==sjcl.bitArray.bitLength(c))throw new sjcl.exception.invalid("ocb iv must be 128 bits");e=e||64;var g=sjcl.mode.ocb2.S,h=sjcl.bitArray,k=h.i,l=[0,0,0,0],n=g(a.encrypt(c)),m,p,r=sjcl.bitArray.bitLength(b)-e,q=[];d=d||[];for(c=0;c+4<r/32;c+=4)m=k(n,a.decrypt(k(n,b.slice(c,c+4)))),l=k(l,m),q=q.concat(m),n=g(n);p=r-32*c;m=a.encrypt(k(n,[0,0,0,p]));m=k(m,h.clamp(b.slice(c),p).concat([0,
  0,0]));l=k(l,m);l=a.encrypt(k(l,k(n,g(n))));d.length&&(l=k(l,f?d:sjcl.mode.ocb2.pmac(a,d)));if(!h.equal(h.clamp(l,e),h.bitSlice(b,r)))throw new sjcl.exception.corrupt("ocb: tag doesn't match");return q.concat(h.clamp(m,p))},pmac:function(a,b){var c,d=sjcl.mode.ocb2.S,e=sjcl.bitArray,f=e.i,g=[0,0,0,0],h=a.encrypt([0,0,0,0]),h=f(h,d(d(h)));for(c=0;c+4<b.length;c+=4)h=d(h),g=f(g,a.encrypt(f(h,b.slice(c,c+4))));c=b.slice(c);128>e.bitLength(c)&&(h=f(h,d(h)),c=e.concat(c,[-2147483648,0,0,0]));g=f(g,c);
  return a.encrypt(f(d(f(h,d(h))),g))},S:function(a){return[a[0]<<1^a[1]>>>31,a[1]<<1^a[2]>>>31,a[2]<<1^a[3]>>>31,a[3]<<1^135*(a[0]>>>31)]}};
  sjcl.mode.gcm={name:"gcm",encrypt:function(a,b,c,d,e){var f=b.slice(0);b=sjcl.bitArray;d=d||[];a=sjcl.mode.gcm.C(!0,a,f,d,c,e||128);return b.concat(a.data,a.tag)},decrypt:function(a,b,c,d,e){var f=b.slice(0),g=sjcl.bitArray,h=g.bitLength(f);e=e||128;d=d||[];e<=h?(b=g.bitSlice(f,h-e),f=g.bitSlice(f,0,h-e)):(b=f,f=[]);a=sjcl.mode.gcm.C(!1,a,f,d,c,e);if(!g.equal(a.tag,b))throw new sjcl.exception.corrupt("gcm: tag doesn't match");return a.data},ka:function(a,b){var c,d,e,f,g,h=sjcl.bitArray.i;e=[0,0,
  0,0];f=b.slice(0);for(c=0;128>c;c++){(d=0!==(a[Math.floor(c/32)]&1<<31-c%32))&&(e=h(e,f));g=0!==(f[3]&1);for(d=3;0<d;d--)f[d]=f[d]>>>1|(f[d-1]&1)<<31;f[0]>>>=1;g&&(f[0]^=-0x1f000000)}return e},j:function(a,b,c){var d,e=c.length;b=b.slice(0);for(d=0;d<e;d+=4)b[0]^=0xffffffff&c[d],b[1]^=0xffffffff&c[d+1],b[2]^=0xffffffff&c[d+2],b[3]^=0xffffffff&c[d+3],b=sjcl.mode.gcm.ka(b,a);return b},C:function(a,b,c,d,e,f){var g,h,k,l,n,m,p,r,q=sjcl.bitArray;m=c.length;p=q.bitLength(c);r=q.bitLength(d);h=q.bitLength(e);
  g=b.encrypt([0,0,0,0]);96===h?(e=e.slice(0),e=q.concat(e,[1])):(e=sjcl.mode.gcm.j(g,[0,0,0,0],e),e=sjcl.mode.gcm.j(g,e,[0,0,Math.floor(h/0x100000000),h&0xffffffff]));h=sjcl.mode.gcm.j(g,[0,0,0,0],d);n=e.slice(0);d=h.slice(0);a||(d=sjcl.mode.gcm.j(g,h,c));for(l=0;l<m;l+=4)n[3]++,k=b.encrypt(n),c[l]^=k[0],c[l+1]^=k[1],c[l+2]^=k[2],c[l+3]^=k[3];c=q.clamp(c,p);a&&(d=sjcl.mode.gcm.j(g,h,c));a=[Math.floor(r/0x100000000),r&0xffffffff,Math.floor(p/0x100000000),p&0xffffffff];d=sjcl.mode.gcm.j(g,d,a);k=b.encrypt(e);
  d[0]^=k[0];d[1]^=k[1];d[2]^=k[2];d[3]^=k[3];return{tag:q.bitSlice(d,0,f),data:c}}};sjcl.misc.hmac=function(a,b){this.W=b=b||sjcl.hash.sha256;var c=[[],[]],d,e=b.prototype.blockSize/32;this.w=[new b,new b];a.length>e&&(a=b.hash(a));for(d=0;d<e;d++)c[0][d]=a[d]^909522486,c[1][d]=a[d]^1549556828;this.w[0].update(c[0]);this.w[1].update(c[1]);this.R=new b(this.w[0])};
  sjcl.misc.hmac.prototype.encrypt=sjcl.misc.hmac.prototype.mac=function(a){if(this.aa)throw new sjcl.exception.invalid("encrypt on already updated hmac called!");this.update(a);return this.digest(a)};sjcl.misc.hmac.prototype.reset=function(){this.R=new this.W(this.w[0]);this.aa=!1};sjcl.misc.hmac.prototype.update=function(a){this.aa=!0;this.R.update(a)};sjcl.misc.hmac.prototype.digest=function(){var a=this.R.finalize(),a=(new this.W(this.w[1])).update(a).finalize();this.reset();return a};
  sjcl.misc.pbkdf2=function(a,b,c,d,e){c=c||1E4;if(0>d||0>c)throw new sjcl.exception.invalid("invalid params to pbkdf2");"string"===typeof a&&(a=sjcl.codec.utf8String.toBits(a));"string"===typeof b&&(b=sjcl.codec.utf8String.toBits(b));e=e||sjcl.misc.hmac;a=new e(a);var f,g,h,k,l=[],n=sjcl.bitArray;for(k=1;32*l.length<(d||1);k++){e=f=a.encrypt(n.concat(b,[k]));for(g=1;g<c;g++)for(f=a.encrypt(f),h=0;h<f.length;h++)e[h]^=f[h];l=l.concat(e)}d&&(l=n.clamp(l,d));return l};
  sjcl.prng=function(a){this.c=[new sjcl.hash.sha256];this.m=[0];this.P=0;this.H={};this.N=0;this.U={};this.Z=this.f=this.o=this.ha=0;this.b=[0,0,0,0,0,0,0,0];this.h=[0,0,0,0];this.L=void 0;this.M=a;this.D=!1;this.K={progress:{},seeded:{}};this.u=this.ga=0;this.I=1;this.J=2;this.ca=0x10000;this.T=[0,48,64,96,128,192,0x100,384,512,768,1024];this.da=3E4;this.ba=80};
  sjcl.prng.prototype={randomWords:function(a,b){var c=[],d;d=this.isReady(b);var e;if(d===this.u)throw new sjcl.exception.notReady("generator isn't seeded");if(d&this.J){d=!(d&this.I);e=[];var f=0,g;this.Z=e[0]=(new Date).valueOf()+this.da;for(g=0;16>g;g++)e.push(0x100000000*Math.random()|0);for(g=0;g<this.c.length&&(e=e.concat(this.c[g].finalize()),f+=this.m[g],this.m[g]=0,d||!(this.P&1<<g));g++);this.P>=1<<this.c.length&&(this.c.push(new sjcl.hash.sha256),this.m.push(0));this.f-=f;f>this.o&&(this.o=
  f);this.P++;this.b=sjcl.hash.sha256.hash(this.b.concat(e));this.L=new sjcl.cipher.aes(this.b);for(d=0;4>d&&(this.h[d]=this.h[d]+1|0,!this.h[d]);d++);}for(d=0;d<a;d+=4)0===(d+1)%this.ca&&y(this),e=z(this),c.push(e[0],e[1],e[2],e[3]);y(this);return c.slice(0,a)},setDefaultParanoia:function(a,b){if(0===a&&"Setting paranoia=0 will ruin your security; use it only for testing"!==b)throw new sjcl.exception.invalid("Setting paranoia=0 will ruin your security; use it only for testing");this.M=a},addEntropy:function(a,
  b,c){c=c||"user";var d,e,f=(new Date).valueOf(),g=this.H[c],h=this.isReady(),k=0;d=this.U[c];void 0===d&&(d=this.U[c]=this.ha++);void 0===g&&(g=this.H[c]=0);this.H[c]=(this.H[c]+1)%this.c.length;switch(typeof a){case "number":void 0===b&&(b=1);this.c[g].update([d,this.N++,1,b,f,1,a|0]);break;case "object":c=Object.prototype.toString.call(a);if("[object Uint32Array]"===c){e=[];for(c=0;c<a.length;c++)e.push(a[c]);a=e}else for("[object Array]"!==c&&(k=1),c=0;c<a.length&&!k;c++)"number"!==typeof a[c]&&
  (k=1);if(!k){if(void 0===b)for(c=b=0;c<a.length;c++)for(e=a[c];0<e;)b++,e=e>>>1;this.c[g].update([d,this.N++,2,b,f,a.length].concat(a))}break;case "string":void 0===b&&(b=a.length);this.c[g].update([d,this.N++,3,b,f,a.length]);this.c[g].update(a);break;default:k=1}if(k)throw new sjcl.exception.bug("random: addEntropy only supports number, array of numbers or string");this.m[g]+=b;this.f+=b;h===this.u&&(this.isReady()!==this.u&&A("seeded",Math.max(this.o,this.f)),A("progress",this.getProgress()))},
  isReady:function(a){a=this.T[void 0!==a?a:this.M];return this.o&&this.o>=a?this.m[0]>this.ba&&(new Date).valueOf()>this.Z?this.J|this.I:this.I:this.f>=a?this.J|this.u:this.u},getProgress:function(a){a=this.T[a?a:this.M];return this.o>=a?1:this.f>a?1:this.f/a},startCollectors:function(){if(!this.D){this.a={loadTimeCollector:B(this,this.ma),mouseCollector:B(this,this.oa),keyboardCollector:B(this,this.la),accelerometerCollector:B(this,this.ea),touchCollector:B(this,this.qa)};if(window.addEventListener)window.addEventListener("load",
  this.a.loadTimeCollector,!1),window.addEventListener("mousemove",this.a.mouseCollector,!1),window.addEventListener("keypress",this.a.keyboardCollector,!1),window.addEventListener("devicemotion",this.a.accelerometerCollector,!1),window.addEventListener("touchmove",this.a.touchCollector,!1);else if(document.attachEvent)document.attachEvent("onload",this.a.loadTimeCollector),document.attachEvent("onmousemove",this.a.mouseCollector),document.attachEvent("keypress",this.a.keyboardCollector);else throw new sjcl.exception.bug("can't attach event");
  this.D=!0}},stopCollectors:function(){this.D&&(window.removeEventListener?(window.removeEventListener("load",this.a.loadTimeCollector,!1),window.removeEventListener("mousemove",this.a.mouseCollector,!1),window.removeEventListener("keypress",this.a.keyboardCollector,!1),window.removeEventListener("devicemotion",this.a.accelerometerCollector,!1),window.removeEventListener("touchmove",this.a.touchCollector,!1)):document.detachEvent&&(document.detachEvent("onload",this.a.loadTimeCollector),document.detachEvent("onmousemove",
  this.a.mouseCollector),document.detachEvent("keypress",this.a.keyboardCollector)),this.D=!1)},addEventListener:function(a,b){this.K[a][this.ga++]=b},removeEventListener:function(a,b){var c,d,e=this.K[a],f=[];for(d in e)e.hasOwnProperty(d)&&e[d]===b&&f.push(d);for(c=0;c<f.length;c++)d=f[c],delete e[d]},la:function(){C(this,1)},oa:function(a){var b,c;try{b=a.x||a.clientX||a.offsetX||0,c=a.y||a.clientY||a.offsetY||0}catch(d){c=b=0}0!=b&&0!=c&&this.addEntropy([b,c],2,"mouse");C(this,0)},qa:function(a){a=
  a.touches[0]||a.changedTouches[0];this.addEntropy([a.pageX||a.clientX,a.pageY||a.clientY],1,"touch");C(this,0)},ma:function(){C(this,2)},ea:function(a){a=a.accelerationIncludingGravity.x||a.accelerationIncludingGravity.y||a.accelerationIncludingGravity.z;if(window.orientation){var b=window.orientation;"number"===typeof b&&this.addEntropy(b,1,"accelerometer")}a&&this.addEntropy(a,2,"accelerometer");C(this,0)}};
  function A(a,b){var c,d=sjcl.random.K[a],e=[];for(c in d)d.hasOwnProperty(c)&&e.push(d[c]);for(c=0;c<e.length;c++)e[c](b)}function C(a,b){"undefined"!==typeof window&&window.performance&&"function"===typeof window.performance.now?a.addEntropy(window.performance.now(),b,"loadtime"):a.addEntropy((new Date).valueOf(),b,"loadtime")}function y(a){a.b=z(a).concat(z(a));a.L=new sjcl.cipher.aes(a.b)}function z(a){for(var b=0;4>b&&(a.h[b]=a.h[b]+1|0,!a.h[b]);b++);return a.L.encrypt(a.h)}
  function B(a,b){return function(){b.apply(a,arguments)}}sjcl.random=new sjcl.prng(6);
  a:try{var D,E,F,G;if(G="undefined"!==typeof module&&module.exports){var H;try{H=require("crypto")}catch(a){H=null}G=E=H}if(G&&E.randomBytes)D=E.randomBytes(128),D=new Uint32Array((new Uint8Array(D)).buffer),sjcl.random.addEntropy(D,1024,"crypto['randomBytes']");else if("undefined"!==typeof window&&"undefined"!==typeof Uint32Array){F=new Uint32Array(32);if(window.crypto&&window.crypto.getRandomValues)window.crypto.getRandomValues(F);else if(window.msCrypto&&window.msCrypto.getRandomValues)window.msCrypto.getRandomValues(F);
  else break a;sjcl.random.addEntropy(F,1024,"crypto['getRandomValues']")}}catch(a){"undefined"!==typeof window&&window.console&&(console.log("There was an error collecting entropy from the browser:"),console.log(a))}
  sjcl.json={defaults:{v:1,iter:1E4,ks:128,ts:64,mode:"ccm",adata:"",cipher:"aes"},ja:function(a,b,c,d){c=c||{};d=d||{};var e=sjcl.json,f=e.g({iv:sjcl.random.randomWords(4,0)},e.defaults),g;e.g(f,c);c=f.adata;"string"===typeof f.salt&&(f.salt=sjcl.codec.base64.toBits(f.salt));"string"===typeof f.iv&&(f.iv=sjcl.codec.base64.toBits(f.iv));if(!sjcl.mode[f.mode]||!sjcl.cipher[f.cipher]||"string"===typeof a&&100>=f.iter||64!==f.ts&&96!==f.ts&&128!==f.ts||128!==f.ks&&192!==f.ks&&0x100!==f.ks||2>f.iv.length||
  4<f.iv.length)throw new sjcl.exception.invalid("json encrypt: invalid parameters");"string"===typeof a?(g=sjcl.misc.cachedPbkdf2(a,f),a=g.key.slice(0,f.ks/32),f.salt=g.salt):sjcl.ecc&&a instanceof sjcl.ecc.elGamal.publicKey&&(g=a.kem(),f.kemtag=g.tag,a=g.key.slice(0,f.ks/32));"string"===typeof b&&(b=sjcl.codec.utf8String.toBits(b));"string"===typeof c&&(f.adata=c=sjcl.codec.utf8String.toBits(c));g=new sjcl.cipher[f.cipher](a);e.g(d,f);d.key=a;f.ct="ccm"===f.mode&&sjcl.arrayBuffer&&sjcl.arrayBuffer.ccm&&
  b instanceof ArrayBuffer?sjcl.arrayBuffer.ccm.encrypt(g,b,f.iv,c,f.ts):sjcl.mode[f.mode].encrypt(g,b,f.iv,c,f.ts);return f},encrypt:function(a,b,c,d){var e=sjcl.json,f=e.ja.apply(e,arguments);return e.encode(f)},ia:function(a,b,c,d){c=c||{};d=d||{};var e=sjcl.json;b=e.g(e.g(e.g({},e.defaults),b),c,!0);var f,g;f=b.adata;"string"===typeof b.salt&&(b.salt=sjcl.codec.base64.toBits(b.salt));"string"===typeof b.iv&&(b.iv=sjcl.codec.base64.toBits(b.iv));if(!sjcl.mode[b.mode]||!sjcl.cipher[b.cipher]||"string"===
  typeof a&&100>=b.iter||64!==b.ts&&96!==b.ts&&128!==b.ts||128!==b.ks&&192!==b.ks&&0x100!==b.ks||!b.iv||2>b.iv.length||4<b.iv.length)throw new sjcl.exception.invalid("json decrypt: invalid parameters");"string"===typeof a?(g=sjcl.misc.cachedPbkdf2(a,b),a=g.key.slice(0,b.ks/32),b.salt=g.salt):sjcl.ecc&&a instanceof sjcl.ecc.elGamal.secretKey&&(a=a.unkem(sjcl.codec.base64.toBits(b.kemtag)).slice(0,b.ks/32));"string"===typeof f&&(f=sjcl.codec.utf8String.toBits(f));g=new sjcl.cipher[b.cipher](a);f="ccm"===
  b.mode&&sjcl.arrayBuffer&&sjcl.arrayBuffer.ccm&&b.ct instanceof ArrayBuffer?sjcl.arrayBuffer.ccm.decrypt(g,b.ct,b.iv,b.tag,f,b.ts):sjcl.mode[b.mode].decrypt(g,b.ct,b.iv,f,b.ts);e.g(d,b);d.key=a;return 1===c.raw?f:sjcl.codec.utf8String.fromBits(f)},decrypt:function(a,b,c,d){var e=sjcl.json;return e.ia(a,e.decode(b),c,d)},encode:function(a){var b,c="{",d="";for(b in a)if(a.hasOwnProperty(b)){if(!b.match(/^[a-z0-9]+$/i))throw new sjcl.exception.invalid("json encode: invalid property name");c+=d+'"'+
  b+'":';d=",";switch(typeof a[b]){case "number":case "boolean":c+=a[b];break;case "string":c+='"'+escape(a[b])+'"';break;case "object":c+='"'+sjcl.codec.base64.fromBits(a[b],0)+'"';break;default:throw new sjcl.exception.bug("json encode: unsupported type");}}return c+"}"},decode:function(a){a=a.replace(/\s/g,"");if(!a.match(/^\{.*\}$/))throw new sjcl.exception.invalid("json decode: this isn't json!");a=a.replace(/^\{|\}$/g,"").split(/,/);var b={},c,d;for(c=0;c<a.length;c++){if(!(d=a[c].match(/^\s*(?:(["']?)([a-z][a-z0-9]*)\1)\s*:\s*(?:(-?\d+)|"([a-z0-9+\/%*_.@=\-]*)"|(true|false))$/i)))throw new sjcl.exception.invalid("json decode: this isn't json!");
  null!=d[3]?b[d[2]]=parseInt(d[3],10):null!=d[4]?b[d[2]]=d[2].match(/^(ct|adata|salt|iv)$/)?sjcl.codec.base64.toBits(d[4]):unescape(d[4]):null!=d[5]&&(b[d[2]]="true"===d[5])}return b},g:function(a,b,c){void 0===a&&(a={});if(void 0===b)return a;for(var d in b)if(b.hasOwnProperty(d)){if(c&&void 0!==a[d]&&a[d]!==b[d])throw new sjcl.exception.invalid("required parameter overridden");a[d]=b[d]}return a},sa:function(a,b){var c={},d;for(d in a)a.hasOwnProperty(d)&&a[d]!==b[d]&&(c[d]=a[d]);return c},ra:function(a,
  b){var c={},d;for(d=0;d<b.length;d++)void 0!==a[b[d]]&&(c[b[d]]=a[b[d]]);return c}};sjcl.encrypt=sjcl.json.encrypt;sjcl.decrypt=sjcl.json.decrypt;sjcl.misc.pa={};sjcl.misc.cachedPbkdf2=function(a,b){var c=sjcl.misc.pa,d;b=b||{};d=b.iter||1E3;c=c[a]=c[a]||{};d=c[d]=c[d]||{firstSalt:b.salt&&b.salt.length?b.salt.slice(0):sjcl.random.randomWords(2,0)};c=void 0===b.salt?d.firstSalt:b.salt;d[c]=d[c]||sjcl.misc.pbkdf2(a,c,b.iter);return{key:d[c].slice(0),salt:c.slice(0)}};
  "undefined"!==typeof module&&module.exports&&(module.exports=sjcl);"function"===typeof define&&define([],function(){return sjcl});

  // ========================================================================================================
  //
  // initialisation
  //

  if ((typeof window !== 'undefined' && window.addEventListener) || (typeof document !== 'undefined' && document.attachEvent)) {
    sjcl.random.startCollectors();
  }

  RavelinJS.RavelinJS = RavelinJS;
  var rjs = new RavelinJS();

  // Add resize listener for session-tracking
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('resize', onResizeDebounce);
  } else if (typeof window !== 'undefined' && window.attachEvent) {
    window.attachEvent('resize', onResizeDebounce);
  }

  // Add paste listener for session-tracking
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('paste', onPaste);
  } else if (typeof document !== 'undefined' && document.attachEvent) {
    document.attachEvent('paste', onPaste);
  }

  var resizeTimer, windowWidth, windowHeight;
  function onResizeDebounce(e) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() { rjs.track(RESIZE_EVENT_TYPE, resizeEventData(e)); }, 250);
  }

  function resizeEventData() {
    var meta = {
      resolutionOld: { w: windowWidth, h: windowHeight },
      resolutionNew: { w: window.innerWidth, h: window.innerHeight }
    };

    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;

    return meta;
  }

  function onPaste(e) {
    var meta = {};

    if (e.target) {
      if (e.target.name) {
        meta.fieldName = e.target.name;
      }
      if (e.target.form) {
        meta.formName = e.target.form.name || e.target.form.id;
        meta.formAction = e.target.form.action;
      }
    }

    // Don't track pastes into password fields, or if the element has a 'no-track' attribute.
    if (!sensitiveElement(e.target)) {
      var clipboardData = e.clipboardData || window.clipboardData;
      if (clipboardData) {
        var pastedData = clipboardData.getData("Text");

        if (pastedData) {
          meta.pastedValue = cleanPan(pastedData);
          if (meta.pastedValue !== pastedData) {
            meta.panCleaned = true;
          }
        }
      }

      if (e.target && e.target.value) {
        meta.fieldValue = cleanPan(e.target.value);
      }

      var selectionPos = getSelectionPosition(e.target);
      if (selectionPos) {
        meta.selectionStart = selectionPos.start;
        meta.selectionEnd = selectionPos.end;
      }
    }

    rjs.track(PASTE_EVENT_TYPE, meta);
  }

  return rjs;
}));

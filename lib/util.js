/**
 * @private
 * @module ravelinjs/util
 */

/**
 * bind wraps a function.
 * @param {Function} fn The function to be called.
 * @param {*} thisArg The 'this' of the invoked fn.
 * @param {...*} [args] Arguments to add to the start of the function call.
 * @returns {Function}
 */
export function bind(fn, thisArg, args) {
  args = Array.prototype.slice.call(arguments, 2);
  if (!Function.prototype.bind) {
    return function () {
      return fn.apply(thisArg, args.concat(arguments));
    };
  }
  return Function.prototype.bind.apply(fn, [thisArg].concat(args));
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
    d0 = Math.random() * 0xffffffff | 0;
    d1 = Math.random() * 0xffffffff | 0;
    d2 = Math.random() * 0xffffffff | 0;
    d3 = Math.random() * 0xffffffff | 0;
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
  return _lut[d0 & 0xff] + _lut[d0 >> 8 & 0xff] + _lut[d0 >> 16 & 0xff] + _lut[d0 >> 24 & 0xff] + '-' +
    _lut[d1 & 0xff] + _lut[d1 >> 8 & 0xff] + '-' + _lut[d1 >> 16 & 0x0f | 0x40] + _lut[d1 >> 24 & 0xff] + '-' +
    _lut[d2 & 0x3f | 0x80] + _lut[d2 >> 8 & 0xff] + '-' + _lut[d2 >> 16 & 0xff] + _lut[d2 >> 24 & 0xff] +
    _lut[d3 & 0xff] + _lut[d3 >> 8 & 0xff] + _lut[d3 >> 16 & 0xff] + _lut[d3 >> 24 & 0xff];
}

/**
 * promiseRetry calls factory up to retries+1 times until the returned promise
 * resolves.
 * @param {PromiseConstructor} P
 * @param {function(): Promise} factory
 * @param {number} [retries=2]
 * @param {number} [retryBackoffMs=150]
 */
export function promiseRetry(P, factory, retries, retryBackoffMs) {
  if (!retries) retries = 2;
  var n = 0;
  return new P(function (resolve, reject) {
    return attempt(0);
    function attempt(delay) {
      return new P(function (r) {
        if (delay) setTimeout(r, delay); else r();
      })
      .then(function () {
        return factory(function retry(err) {
          throw { message: 'promise-retry', err: err };
        }, ++n);
      })
      .then(
        resolve,
        function (e) {
          if (e && e.message === 'promise-retry') {
            if (n - 1 < retries) {
              return attempt(delay + (retryBackoffMs || 150));
            }
            reject(e.err);
            return;
          }
          reject(e);
        }
      );
    }
  });
}

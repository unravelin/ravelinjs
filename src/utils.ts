export interface Dictionary<T> {
  [key: string]: T;
}

/**
 * A lookup table used for uuid generation. Populated on first usage.
 */
let _lut: string[];

/**
 * Generates a fresh [UUID v4](https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_4_(random)).
 */
export function uuid(): string {
  let d0: number, d1: number, d2: number, d3: number;

  // Try to use the newer, randomer crypto.getRandomValues if available
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    window.crypto.getRandomValues &&
    typeof Int32Array !== 'undefined'
  ) {
    const d = new Int32Array(4);
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
    d0 = (Math.random() * 0xffffffff) | 0;
    d1 = (Math.random() * 0xffffffff) | 0;
    d2 = (Math.random() * 0xffffffff) | 0;
    d3 = (Math.random() * 0xffffffff) | 0;
  }

  // Populate our lookup table (_lut) sequentially with hexidecimal strings
  // starting from 00 all the way through to ff, covering the entire 256 hex
  // range.
  if (!_lut) {
    _lut = [];
    for (let i = 0; i < 256; i++) {
      _lut[i] = (i < 16 ? '0' : '') + i.toString(16);
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
  // The result are identifiers of 36 characters, 34 of which are
  // randomly assigned.

  // prettier-ignore
  return _lut[d0 & 0xff] + _lut[d0 >> 8 & 0xff] + _lut[d0 >> 16 & 0xff] + _lut[d0 >> 24 & 0xff] + '-' +
    _lut[d1 & 0xff] + _lut[d1 >> 8 & 0xff] + '-' + _lut[d1 >> 16 & 0x0f | 0x40] + _lut[d1 >> 24 & 0xff] + '-' +
    _lut[d2 & 0x3f | 0x80] + _lut[d2 >> 8 & 0xff] + '-' + _lut[d2 >> 16 & 0xff] + _lut[d2 >> 24 & 0xff] +
    _lut[d3 & 0xff] + _lut[d3 >> 8 & 0xff] + _lut[d3 >> 16 & 0xff] + _lut[d3 >> 24 & 0xff];
}

/**
 * Custom error interface for promiseRetry logic.
 */
interface RetryError {
  message: 'promise-retry';
  err: any;
}

/**
 * Calls factory up to retries+1 times until the returned promise resolves.
 * @param factory A function that returns a Promise.
 * @param retries Number of retries (default 2).
 * @param retryBackoffMs Backoff in milliseconds (default 150).
 */
export function promiseRetry<T>(
  factory: (retry: (err: any) => never, attempt: number) => Promise<T>,
  retries: number = 2,
  retryBackoffMs: number = 150
): Promise<T> {
  let n = 0;

  return new Promise<T>((resolve, reject) => {
    function attempt(delay: number): Promise<void> {
      return (
        new Promise<void>(innerResolve => {
          if (delay) {
            setTimeout(innerResolve, delay);
          } else {
            innerResolve();
          }
        })
          .then(() => {
            return factory((err: any) => {
              // We throw a specific object to catch in the next .catch block
              // to distinguish between a retry request and a fatal error.
              throw { message: 'promise-retry', err } as RetryError;
            }, ++n);
          })
          // Return the resolved value from calling factory
          .then(resolve)
          .catch((e: any) => {
            if (e && e.message === 'promise-retry') {
              if (n - 1 < retries) {
                // Recurse with backoff
                return attempt(delay + retryBackoffMs);
              }
              reject(e.err);
              return;
            }
            reject(e);
          })
      );
    }

    return attempt(0);
  });
}

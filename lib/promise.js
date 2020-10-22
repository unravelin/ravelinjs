/**
 * The promise module provides a [Promise/A+](https://promisesaplus.com/)
 * fallback for [browsers that do not have their own
 * Promise](https://caniuse.com/promises). The promise module is required to
 * support Internet Explorer. The ravelinjs library makes use of Promises to
 * provide asynchronous responses in a forward-compatibile way. The Promise
 * implementation is provided by [Yaku](https://github.com/ysmood/yaku).
 *
 * @module promise
 */

import Promise from 'yaku/lib/yaku.aplus';
export default Promise;

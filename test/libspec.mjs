const couldNotFindElement = /Could not find element/;

/**
 * Usually, `const e = $(selector); e.waitForExists()` will wait until e is on
 * the page. On old versions of selenium, `$` will throw an exception before we
 * can get to `waitForExists`. This resolves that problem.
 *
 * @param {Object} p
 * @param {String} p.selector The argument passed to $.
 * @param {Number} [p.retries=3]
 * @param {Number} [p.retryDelayMs=3000]
 * @param {RegExp} [p.retryPattern=/Could not find element/]
 */
export async function retry$({selector, retries=3, retryDelayMs=3000, retryPattern=couldNotFindElement}){
  let attempt = 0;
  while (true) {
    try {
      return await $(selector);
    } catch(err) {
      if (retryPattern && typeof err?.message === 'string' && !retryPattern.test(err.message)) {
        throw err;
      }
      if (++attempt >= retries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }
}

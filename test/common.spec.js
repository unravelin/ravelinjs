/* jshint esversion: 9, node: true, browser: false */
const { diff } = require('deep-diff');
const log = require('@wdio/logger').default('common.spec');

/** @typedef {(browser) => void} NavTest */

/**
 * navigate attempts to load a page into the browser from the list of urls. For
 * each URL, each test is attempted in sequence a few times until it completes.
 * If all tests complete then the page is considered loaded. Otherwise, the next
 * URL is tried. If all URLs fail then we call browser.resetSession to try
 * another. This process is repeated up to two times.
 *
 * @param {Browser} browser
 * @param {object} page
 * @param {string} page.url
 * @param {NavTest[]} page.tests
 * @param {number} [page.attempts=2]
 * @param {object} [page.waitOpts] Options for browser.waitUntil
 */
function navigate(browser, {url, tests, attempts, waitOpts}) {
  var errs = [];
  for (var r = 0; r < (attempts || 2); r++) {
    browser.url(url);
    try {
      // Confirm that the page loaded with the title we expected.
      tests.forEach(f => browser.waitUntil(() => (f(browser), true), waitOpts));
      return;
    } catch (e) {
      const m = e.message.replace(/^waitUntil condition failed with the following reason: /, '');
      log.warn(`Session ${browser.sessionId} failed to load ${url}: ${m}`);
      errs.push(m);
    }

    // If none of the pages we tried worked, perhaps we've got a network issue?
    // Try getting a fresh session to kick things off.
    log.warn(`Session ${browser.sessionId} failed to load all URLs once. Reloading.`);
    browser.reloadSession();
  }
  throw new Error(`Failed to load all pages: ${errs.join("; ")}`);
}

/**
 * hasTitle throws an exception if browser.getTitle() does not contain substr.
 *
 * @param {string} substr The substring to be found in the page title.
 * @returns {NavTest}
 */
function hasTitle(substr) {
  return function(browser) {
    const title = browser.getTitle();
    if (title.indexOf(substr) === -1) {
      throw new Error(`Expected page title containing ${substr} but found: ${title}`);
    }
  };
}

/**
 * hasURL throws an exception if browser.getUrl() does not contain substr.
 *
 * @param {string} substr The substring to be found in the page url.
 * @returns {NavTest}
 */
function hasURL(substr) {
  return function(browser) {
    const url = browser.getUrl();
    if (url.indexOf(substr) === -1) {
      throw new Error(`Expected page title containing ${substr} but found: ${url}`);
    }
  };
}

/**
 * hasElement invokes $(selector), which throws an exception if the element is
 * not found.
 * @param {string} selector
 * @returns {NavTest}
 */
function hasElement(selector) {
  return browser => browser.$(selector).isExisting();
}

/**
 * objDiff throws an error if act has any fields that differ or are missing from
 * exp. Fields present on act but missing in exp are not an error.
 * @param {object} act
 * @param {object} exp
 * @param {string} [msg]
 */
function objDiff(act, exp, msg) {
  const d = diff(exp, act)
    .filter(c => c.kind != 'A' && c.kind != 'N')
    .map(c => `- ${c.path.join(".")}: ${c.lhs}` + (c.kind == 'E' ? `\n+ ${c.path.join(".")}: ${c.rhs}` : ''))
    .join("\n");
  if (d) {
    throw new Error(msg + (msg ? ': ' : '') + 'expected (-) but got (+):\n' + d);
  }
}

module.exports = {
  navigate,
  hasTitle,
  hasURL,
  hasElement,
  objDiff,
};

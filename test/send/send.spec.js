const log = require('@wdio/logger').default('send.spec');
const { navigate, hasTitle, hasElement, hasURL } = require('../common.spec.js');
const { fetchRequest } = require('../server');
const buildURL = require('build-url');
const fetch = require('node-fetch');

describe('ravelinjs.core.send', function () {
  // it('sends to paths', function() {
  //   // http://test.browserstack.com/send/ -> /z/err
  //   test('/', '/', 'path');
  // });

  // it('sends to samesite URLs', function() {
  //   // http://test.browserstack.com/send/ -> http://test.browserstack.com/z/err/
  //   test('/', process.env.TEST_LOCAL, 'samesite');
  // });

  it('sends to remote URLs', function () {
    // http://test.browserstack.com/send/ -> http://test.ngrok.io/z/err
    // test('/', process.env.TEST_REMOTE.replace(/^https:/, 'http:'), 'remote');

    fetch(process.env.TEST_REMOTE)
      .then(data => {
        console.log('[Success]:', data);
      })
      .catch((error) => {
        console.error('[Error]:', error);
      });
    fetch(process.env.TEST_REMOTE.replace(/^https:/, 'http:'))
      // .then(response => response.json())
      .then(data => {
        console.log('[Success]:', data);
      })
      .catch((error) => {
        console.error('[Error]:', error);
      });
  });
});

function test(page, api, msg) {
  const key = browser.sessionId;

  // Visit `${page}/send/?api=${api}&key=${key}&msg=${msg}`.
  navigate(browser, {
    attempts: 3,
    url: buildURL(page, { path: '/send/', queryParams: { api, key, msg } }),
    tests: [
      // Confirm the page has loaded.
      hasURL(key), hasTitle('send'), hasElement('#output'),
      // Wait for the test to complete.
      hasElement('#completed'),
    ],
  });

  // Check whether the browser reported any errors.
  const e = $('#error').getText();
  if (e) throw new Error(e);

  // Confirm that an AJAX request with the error was received.
  browser.waitUntil(function () {
    return browser.call(
      () => fetchRequest(process.env.TEST_INTERNAL, {
        'path': '/z',
        'query': { 'key': key },
        'bodyJSON.msg': { '$eq': msg },
      })
    );
  });

  // Warn if it took several attempts to send.
  const r = $('#output').getText();
  log.debug('stats', r);
  if (r) {
    const stats = JSON.parse(r);
    if (stats.attempts > 1) {
      log.warn(`Succeeded after ${stats.attempts - 1} failures:`, stats.failures);
    }
  }
}
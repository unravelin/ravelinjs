const { expectRequest } = require('../server');
const promiseRetry = require('promise-retry');
const buildURL = require('build-url');

describe('ravelinjs.core.send', function() {
  it('sends to paths', function() {
    // http://test.browserstack.com/send/ -> /z/err
    return test('/', '/', 'path');
  });

  it('sends to samesite URLs', function() {
    // http://test.browserstack.com/send/ -> http://test.browserstack.com/z/err/
    return test('/', process.env.TEST_LOCAL, 'samesite');
  });

  it('sends to remote URLs', function() {
    // http://test.browserstack.com/send/ -> http://test.ngrok.io/z/err
    return test('/', process.env.TEST_REMOTE.replace(/^https:/, 'http:'), 'remote');
  });
});

function test(page, api, msg) {
  const key = browser.sessionId;

  // Visit `${page}/send/?api=${api}&key=${key}&msg=${msg}`.
  browser.url(buildURL(page, {path: '/send/', queryParams: {api, key, msg}}));
  expect(browser).toHaveUrlContaining(key);

  // Wait for the browser to finish reporting the error message.
  browser.waitUntil(function() {
    return !!$('#completed');
  });

  // Check whether the browser reported any errors.
  const e = $('#error').getText();
  if (e) throw new Error(e);

  // Confirm that an AJAX request with the error was received.
  return promiseRetry(function(retry) {
    return expectRequest(process.env.TEST_INTERNAL, {
      'path': {'$eq': '/z/err'},
      'query': {'key': {'$eq': key}},
      'bodyJSON': {'msg': {'$eq': msg}},
    }).catch(retry);
  }, {retries: 2});
}

import wdiolog from '@wdio/logger';
import { navigate, hasTitle, hasElement, hasURL } from '../common.spec.mjs';
import { fetchRequest } from '../server.mjs';
import buildURL from 'build-url';

const log = wdiolog('send.spec');

describe('ravelinjs.core.send', function() {
  it('sends to paths', async function() {
    // https://bs-local.com/send/ -> /z/err
    await test('/', '/', 'path');
  });

  it('sends to samesite URLs', async function() {
    // https://bs-local.com/send/ -> https://bs-local.com/z/err/
    await test('/', process.env.TEST_LOCAL, 'samesite');
  });

  it('sends to remote URLs', async function() {
    // https://bs-local.com/send/ -> https://test.ngrok.io/z/err
    await test('/', process.env.TEST_REMOTE, 'remote');
  });
});

async function test(page, api, msg) {
  const key = browser.sessionId;

  // Visit `${page}/send/?api=${api}&key=${key}&msg=${msg}`.
  await navigate(browser, {
    attempts: 3,
    url: buildURL(page, {path: '/send/', queryParams: {api, key, msg}}),
    tests: [
      // Confirm the page has loaded.
      hasURL(key), hasTitle('send'), hasElement('#output'),
      // Wait for the test to complete.
      hasElement('#completed'),
    ],
  });

  // Check whether the browser reported any errors.
  const e = await $('#error').getText();
  if (e) throw new Error(e);

  // Confirm that an AJAX request with the error was received.
  await browser.waitUntil(async () => await browser.call(
    () => fetchRequest(process.env.TEST_INTERNAL, {
      'path': '/z',
      'query': {'key': key},
      'bodyJSON.msg': {'$eq': msg},
    })
  ));

  // Warn if it took several attempts to send.
  const r = await $('#output').getText();
  log.debug('stats', r);
  if (r) {
    const stats = JSON.parse(r);
    if (stats.attempts > 1) {
      log.warn(`Succeeded after ${stats.attempts-1} failures:`, stats.failures);
    }
  }
}

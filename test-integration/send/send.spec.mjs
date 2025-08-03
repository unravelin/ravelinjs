import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import {
  buildDriver,
  buildUrl,
  fetchRequestLog,
  hasElement,
  hasTitle,
  hasURL,
  navigate,
} from '../utils.mjs';

describe('ravelinjs.core.send', () => {
  /** @type {import('selenium-webdriver').WebDriver} */
  let driver;

  before(() => {
    driver = buildDriver();
  });

  after(async () => {
    await driver.quit();
  });

  it('sends to paths', async () => {
    // http://bs-local.com:3000/send/ -> /z/
    await runTest('/', 'path');
  });

  it('sends to samesite URLs', async () => {
    // http://bs-local.com:3000/send/ -> http://bs-local.com/z/
    await runTest('http://bs-local.com/', 'samesite');
  });

  it('sends to remote URLs', async () => {
    console.log('Running remote test:', process.env.TUNNEL_URL);

    // http://bs-local.com:3000/send/ -> https://....ngrok-free.app/
    await runTest(process.env.TUNNEL_URL, 'remote');
  });

  async function runTest(api, msg) {
    const key = (await driver.getSession()).getId();

    // Visit `${base}/send/?api=${api}&key=${key}&msg=${msg}`.
    await navigate(driver, {
      url: buildUrl({ path: '/send', queryParams: { api, key, msg } }),
      tests: [
        // Confirm the page has loaded.
        hasURL(key),
        hasTitle('send'),
        hasElement('output'),
        // Wait for the test to complete.
        hasElement('completed'),
      ],
    });

    // Check whether the browser reported any errors.
    const error = await driver.findElement(By.id('error'));
    const errorText = await error.getText();
    if (errorText) {
      throw new Error(`Error in test: ${errorText}`);
    }

    // Confirm that a request to /z was received with the expected value.
    const req = await fetchRequestLog(driver, {
      path: '/z',
      query: { key },
      'bodyJSON.msg': { $eq: msg },
    });

    expect(req).to.be.an('object');

    // Warn if it took several attempts to send.
    const output = await driver.findElement(By.id('output'));
    const outputText = await output.getText();
    if (outputText) {
      try {
        const stats = JSON.parse(outputText);
        if (stats.attempts > 1) {
          console.warn(`Succeeded after ${stats.attempts - 1} failures:`, stats.failures);
        }
      } catch (e) {
        console.warn('Failed to parse output stats:', e);
      }
    }
  }
});

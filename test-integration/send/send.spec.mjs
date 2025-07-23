import { By } from 'selenium-webdriver';
import { buildDriver, buildUrl, hasElement, hasTitle, hasURL, navigate } from '../utils.mjs';

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
    // http://bs-local.com/send/ -> /z/err
    await runTest('/', 'path');
  });

  async function runTest(api, msg) {
    const key = (await driver.getSession()).getId();

    // Visit `${page}/send/?api=${api}&key=${key}&msg=${msg}`.
    await navigate(driver, {
      attempts: 3,
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

    // TODO
    // Confirm that an AJAX request with the error was received.
    // await browser.waitUntil(
    //   async () =>
    //     await browser.call(() =>
    //       fetchRequest(process.env.TEST_INTERNAL, {
    //         path: '/z',
    //         query: { key: key },
    //         'bodyJSON.msg': { $eq: msg },
    //       })
    //     )
    // );

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

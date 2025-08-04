import { By } from 'selenium-webdriver';
import { buildDriver, buildUrl, hasElement, hasTitle, navigate } from '../utils.mjs';

describe('ravelinjs unit tests', () => {
  /** @type {import('selenium-webdriver').WebDriver} */
  let driver;

  before(() => {
    driver = buildDriver();
  });

  after(async () => {
    await driver.quit();
  });

  it('passes', async () => {
    // Visit `/unit/`
    await navigate(driver, {
      url: buildUrl({ path: '/unit', queryParams: {} }),
      tests: [
        // Wait for the page to load.
        hasTitle('Mocha'),
        hasElement('mocha-stats'),
      ],
    });

    // Wait for the Mocha tests to complete.
    await driver.wait(
      async () => {
        const c = await driver.findElements(By.id('completed'));
        return !!c.length;
      },
      30000, // Wait up to 30s
      '',
      1000 // Poll every 1s
    );

    // Check whether Mocha reported any errors.
    const statsElem = await driver.findElement(By.id('mocha-stats')).getText();
    // Format the stats text to be more readable by adding commas between pass/fail/duration counts.
    const stats = statsElem.replace(/(\d)([fd])/g, '$1, $2');

    // No failures reported.
    if (stats.indexOf('failures: 0,') !== -1) {
      return;
    }

    // Report back errors.
    const failures = await driver.findElement(By.id('error')).getText();
    throw new Error('Stats: ' + stats + '. ' + failures);
  });
});

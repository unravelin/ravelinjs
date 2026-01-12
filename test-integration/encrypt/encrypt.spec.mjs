import { By } from 'selenium-webdriver';
import { buildDriver, buildUrl, hasElement, hasTitle, navigate } from '../utils.mjs';

describe('ravelinjs.encrypt', () => {
  /** @type {import('selenium-webdriver').WebDriver} */
  let driver;

  before(() => {
    driver = buildDriver();
  });

  after(async () => {
    await driver.quit();
  });

  it('encrypts', async () => {
    // Visit `${base}/encrypt/?rsaKey=${rsaKey}`.
    const rsaKey = encodeURIComponent(process.env.E2E_RSA_KEY || '');
    await navigate(driver, {
      url: buildUrl({ path: '/encrypt', queryParams: { rsaKey } }),
      tests: [hasTitle('encrypt'), hasElement('output')],
    });

    const enc = await driver.findElement(By.id('encrypt'));
    const err = await driver.findElement(By.id('error'));
    const out = await driver.findElement(By.id('output'));

    // Check whether the browser reported any errors.
    const initialErrorText = await err.getText();
    if (initialErrorText) {
      throw new Error(`Error in test: ${initialErrorText}`);
    }

    // Fill in the form with test data if provided.
    if (process.env.E2E_NAME_ON_CARD) {
      const nameInput = await driver.findElement(By.id('name'));
      await nameInput.sendKeys(process.env.E2E_NAME_ON_CARD);
    }

    while (true) {
      // Submit the form.
      await enc.click();
      const errText = await err.getText();

      // Retry with a seeded generator, if necessary.
      if (errText.indexOf('generator not ready') !== -1) {
        console.log('Generator not seeded so jiggling the mouse a bit.');

        // The browser needs some user actions as a source of entropy for the
        // pseudo-random number generator. Move the mouse between a few elements
        // to seed the generator.
        for (let i = 0; i < 20; i++) {
          await driver.actions().move({ origin: enc }).perform();
          await driver.actions().move({ origin: err }).perform();
          await driver.actions().move({ origin: out }).perform();
        }
        continue;
      }

      // Check if there was an error.
      if (errText) {
        throw new Error(errText);
      }
      break;
    }

    // Check the results look valid.
    const outText = await out.getText();
    if (outText.indexOf('aesKeyCiphertext') == -1) {
      throw new Error(
        'Expected encryption output to container "aesKeyCiphertext" but received: ' + outText
      );
    }

    // Store the cipher for the e2e-test to load.
    const outFile = process.env.E2E_CIPHERTEXT_FILE;
    if (outFile) {
      console.log(`Writing cipher into ${outFile}: ${outText}`);
      (await import('node:fs')).writeFileSync(outFile, outText);
    }
  });
});

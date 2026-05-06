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
    // We visit `${base}/encrypt/?rsaKey=${rsaKey}`.
    //
    // We don't URI-encode rsaKey here as this is done by buildUrl below. (The
    // toString method on a value of type URL will URI-encode it. If we
    // doubly-encode it, we'd have to doubly-decode it, as well.)
    const rsaKey = process.env.E2E_RSA_KEY || '';
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
      await nameInput.clear(); // Remove "Mr Test" from the field.
      await nameInput.sendKeys(process.env.E2E_NAME_ON_CARD);
    }

    // Submit the form.
    await enc.click();

    // Check if there was an error.
    const errText = await err.getText();
    if (errText) {
      throw new Error(errText);
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

import wdiolog from '@wdio/logger'
import { navigate, hasTitle, hasElement } from '../common.spec.js'

const log = wdiolog('encrypt.spec')

describe('Ravelin.encrypt', function () {
  it('encrypts', async function() {
    // Check the page loads.
    await navigate(browser, {
      url: '/encrypt/?rsaKey=' + encodeURIComponent(process.env.E2E_RSA_KEY || ''),
      tests: [hasTitle('encrypt'), hasElement('#output')],
    });
    var e = await $('#error').getText();
    if (e) throw new Error(e);

    const enc = await $('#encrypt'),
          err = await $('#error'),
          out = await $('#output');

    if (process.env.E2E_NAME_ON_CARD) {
      await $('#name').setValue(process.env.E2E_NAME_ON_CARD);
    }

    // Submit the form.
    await enc.click();

    // Check if there was an error.
    const errText = await err.getText();
    if (errText) {
      throw new Error(errText);
    }

    // Check the results looked valid.
    const outText = await out.getText();
    if (outText.indexOf('aesKeyCiphertext') == -1) {
      throw new Error('Expected encryption output to container "aesKeyCiphertext" but received: ' + outText);
    }

    // Store the cipher for the e2e-test to load.
    const outFile = process.env.E2E_CIPHERTEXT_FILE;
    if (outFile) {
      log.info(`Writing cipher into ${outFile}: ${outText}`);
      (await import('node:fs')).writeFileSync(outFile, outText);
    }
  });
});

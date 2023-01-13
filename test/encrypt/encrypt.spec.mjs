import wdiolog from '@wdio/logger'
import { navigate, hasTitle, hasElement } from '../common.spec.mjs'

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

    while (true) {
      // Submit the form.
      await enc.click();
      const errText = await err.getText();

      // Retry with a seeded generator, if necessary.
      if (errText.indexOf("generator not ready") !== -1) {
        log.warn('Generator not seeded so jiggling the mouse a bit.', browser.capabilities);

        // The browser needs some user actions as a source of entropy for the
        // pseudo-random number generator. Move the mouse between a few elements
        // to seed the generator.
        for (let i = 0; i < 20; i++) {
          await enc.moveTo();
          await err.moveTo();
          await out.moveTo();
        }
        continue;
      }

      // Check if there was an error.
      if (errText) {
        throw new Error(errText);
      }
      break;
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

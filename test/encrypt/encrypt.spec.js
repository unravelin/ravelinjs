const log = require('@wdio/logger').default('encrypt.spec');
const { navigate, hasTitle, hasElement } = require('../common.spec.js');

describe('Ravelin.encrypt', function () {
  it('encrypts', function() {
    // Check the page loads.
    navigate(browser, {
      url: '/encrypt/?rsaKey=' + encodeURIComponent(process.env.E2E_RSA_KEY || ''),
      tests: [hasTitle('encrypt'), hasElement('#output')],
    });
    var e = $('#error').getText();
    if (e) throw new Error(e);

    const enc = $('#encrypt'),
          err = $('#error'),
          out = $('#output');

    if (process.env.E2E_NAME_ON_CARD) {
      $('#name').setValue(process.env.E2E_NAME_ON_CARD);
    }

    while (true) {
      // Submit the form.
      enc.click();
      const errText = err.getText();

      // Retry with a seeded generator, if necessary.
      if (errText.indexOf("generator not ready") !== -1) {
        log.warn('Generator not seeded so jiggling the mouse a bit.', browser.capabilities);

        // The browser needs some user actions as a source of entropy for the
        // pseudo-random number generator. Move the mouse between a few elements
        // to seed the generator.
        for (let i = 0; i < 20; i++) {
          enc.moveTo();
          err.moveTo();
          out.moveTo();
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
    const outText = out.getText();
    if (outText.indexOf('aesKeyCiphertext') == -1) {
      throw new Error('Expected encryption output to container "aesKeyCiphertext" but received: ' + outText);
    }

    // Store the cipher for the e2e-test to load.
    if (process.env.E2E_CIPHERTEXT_FILE) {
      require('fs').writeFileSync(process.env.E2E_CIPHERTEXT_FILE, outText);
    }
  });
});

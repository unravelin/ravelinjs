const log = require('@wdio/logger').default('ravelinjs');

describe('Ravelin.encrypt', function () {
  it('loads', function() {
    browser.url('/encrypt/');
    expect(browser).toHaveTitleContaining('ravelinjs');

    var e = $('#error').getText();
    if (e) throw new Error(e);
  });

  it('encrypts', function() {
    const enc = $('#encrypt'),
          err = $('#error'),
          out = $('#output');

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
  });
});

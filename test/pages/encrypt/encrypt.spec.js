/* globals describe, require, it, expect, browser, $ */

const log = require('@wdio/logger').default('ravelinjs');

describe('Ravelin.encrypt', function () {
  it('loads', function() {
    browser.url('/pages/encrypt/');
    expect(browser).toHaveTitleContaining('ravelinj');
  });

  it('initialises', function() {
    $('#init').click();

    var e = $('#error').getText();
    if (e) throw new Error(e);
    expect($('#output')).toHaveTextContaining('Initialised');
  });

  it('encrypts', function() {
    // Fill in the card encryption form
    $('#name').setValue('John');
    $('#number').setValue('4111 1111 1111 1111');
    $('#month').selectByAttribute('value', '4');
    $('#year').setValue('2019');

    const enc = $('#encrypt'),
          err = $('#error'),
          out = $('#output');

    // Submit the form.
    let {errText, outText} = encrypt();
    function encrypt() {
      enc.click();

      let errText = err.getText(),
          outText = out.getText();
      if (errText == "" && outText == "") {
        // $('#encrypt').click() isn't doing the job on some browsers. The
        // operation doesn't trigger the event handler - the button just appears
        // unclicked. It's happening consistently with Android 5/7 and Safari 13
        // running on Browserstack. We seem to be able to reliably click the
        // button with JavaScript despite this.
        log.warn('Extra clicking required', browser.capabilities);
        browser.execute(function () {
          document.getElementById('encrypt').click();
        });
        errText = err.getText();
        outText = out.getText();
      }
      return {errText, outText};
    }

    // Seed the generator, if necessary.
    while (errText === "NOT READY: generator isn't seeded") {
      log.warn('Generator not seeded so jiggling the mouse a bit.', browser.capabilities);

      // The browser needs some user actions as a source of entropy for the
      // pseudo-random number generator. Move the mouse between a few elements to
      // seed the generator.
      for (let i = 0; i < 20; i++) {
        enc.moveTo();
        err.moveTo();
        out.moveTo();
      }

      // Re-submit the form.
      ({errText, outText} = encrypt());
    }

    // Check there was no error.
    if (errText) {
      throw new Error(errText);
    }

    // Check the results looked valid
    if (outText.indexOf('aesKeyCiphertext') == -1) {
      throw new Error('Expected encryption output to container "aesKeyCiphertext" but received: ' + outText);
    }
  });
});

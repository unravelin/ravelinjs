const log = require('@wdio/logger').default('ravelinjs');

describe('ravelinjs', function () {
  before(function () {
    if (process.env.SKIP_ALL) {
      this.skip();
    }
  });

  describe('script tag usage', function () {
    suite('/pages/scripttag/');
  });

  describe('script tag minified usage', function () {
    suite('/pages/scripttag-min/');
  });

  describe('requirejs usage', function () {
    suite('/pages/amd/');
  });

  describe('requirejs minified usage', function () {
    suite('/pages/amd-min/');
  });

  describe('webpack usage', function () {
    suite('/pages/webpack/');
  });
});

function suite(page) {
  before(function () {
    const described = this.currentTest.parent.title;
    if (process.env.SUITE && described.indexOf(process.env.SUITE) == -1) {
      this.skip();
    }
  });

  it('loads', function () {
    browser.url(page);
  });
  it('sets device cookies', function () {
    checkCookiesAreSet();
  })
  it('collects basic device data', function () {
    checkFingerprintingDoesNotError();
  });
  it('tracks page events', function () {
    checkTrackingEventsDoNotError();
  })
  it('encrypts cards', function () {
    checkCardEncryptionWorks();
  });
}

function checkCookiesAreSet() {
  const want = ['ravelinSessionId', 'ravelinDeviceId'];
  const have = browser.getCookies(want);

  for (let w of want) {
    let found = false;
    for (let h of have) {
      if (h.name === w) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error('Expected cookie "' + w + '" to be set.');
    }
  }
}

function checkCardEncryptionWorks() {
  // Fill in the card encryption form
  $('#name').setValue('John');
  $('#number').setValue('4111 1111 1111 1111');
  $('#month').selectByAttribute('value', '4');
  $('#year').setValue('2019');

  const enc = $('#encrypt'),
        err = $('#encryptionOutputError'),
        out = $('#encryptionOutput');

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
}

function checkFingerprintingDoesNotError() {
  // We have hooked up the #trackFingerprint button to call ravelinjs.trackFingerprint
  // and provided a callback that writes any resulting errors to #fingerprintError.
  // No text in #fingerprintError means no error occured fingerprinting the device.
  // Reference common.js to check out these registrations.
  $('#trackFingerprint').click();

  browser.pause(1000);

  const error = $('#fingerprintError').getText();
  if (error) throw new Error(error);
}

function checkTrackingEventsDoNotError() {
  // We have hooked up the #track, #trackPage, #trackLogin and #trackLogout buttons to call
  // their respective ravelinjs functions,  and provided a callback that writes any errors to #trackingError.
  // No text in #trackingError means no error occured fingerprinting the device.
  // Reference common.js to check out these registrations.
  var buttons = ['', 'Page', 'Login', 'Logout'];

  for (var i = 0; i < buttons.length; i++) {
    $('#track' + buttons[i]).click();

    browser.pause(1000);

    const error = $('#trackingError').getText();
    if (error) throw new Error(error);
  }
}

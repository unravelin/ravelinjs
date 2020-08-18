describe('ravelinjs', function() {
  before(function() {
    if (process.env.SKIP_ALL) {
      this.skip();
    }
  });

  describe('script tag usage', function() {
    suite('/pages/scripttag/');
  });

  // describe('script tag minified usage', function() {
  //   suite('/pages/scripttag-min/');
  // });

  // describe('requirejs usage', function() {
  //   suite('/pages/amd/');
  // });

  // describe('requirejs minified usage', function() {
  //   suite('/pages/amd-min/');
  // });

  // describe('webpack usage', function() {
  //   suite('/pages/webpack/');
  // });
});

function suite(page) {
  before(function() {
    const described = this.currentTest.parent.title;
    if (process.env.SUITE && described.indexOf(process.env.SUITE) == -1) {
      this.skip();
    }
  });

  it('loads', function() {
    browser.url(page);
  });
  it('sets device cookies', function() {
    checkCookiesAreSet();
  })
  it('collects basic device data', function() {
    checkFingerprintingDoesNotError();
  });
  it ('tracks page events', function() {
    checkTrackingEventsDoNotError();
  })
  it('encrypts cards', function() {
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
  $('#encrypt').click();

  browser.pause(5000);

  // Check there was no error
  var error = $('#encryptionOutputError').getText();
  if (error) throw new Error(error);

  // Check the results looked valid
  expect($('#encryptionOutput')).toHaveTextContaining('aesKeyCiphertext');
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

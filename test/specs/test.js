describe('ravelinjs', function() {

  describe('script tag usage', function() {
    suite('/pages/scripttag/index.html');
  });

  describe('script tag minified usage', function() {
    suite('/pages/scripttag-min/index.html');
  });

  describe('requirejs usage', function() {
    suite('/pages/amd/index.html');
  });

  describe('requirejs minified usage', function() {
    suite('/pages/amd-min/index.html');
  });

  describe('webpack usage', function() {
    suite('/pages/webpack/index.html');
  });
});

function suite(page) {
  it('loads', function() {
    browser.waitForURL(page);
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
  if (!browser.getCookie('ravelinDeviceId')) {
    throw new Error('Expected cookie "ravelinDeviceId" to be set');
  }

  if (!browser.getCookie('ravelinSessionId')) {
    throw new Error('Expected cookie "ravelinSessionId" to be set');
  }
}

function checkCardEncryptionWorks() {
  // Fill in the card encryption form
  browser.setValue('#name', 'John');
  browser.setValue('#number', '4111 1111 1111 1111');
  browser.selectByValue('#month', '4');
  browser.setValue('#year', '2019');
  browser.click('#encrypt');

  browser.pause(5000);

  // Check there was no error
  var error = browser.getText('#encryptionOutputError');
  if (error) throw new Error(error);

  // Check the results looked valid
  browser.getText('#encryptionOutput').should.contain('aesKeyCiphertext');
}

function checkFingerprintingDoesNotError() {
  // We have hooked up the #trackFingerprint button to call ravelinjs.trackFingerprint
  // and provided a callback that writes any resulting errors to #fingerprintError.
  // No text in #fingerprintError means no error occured fingerprinting the device.
  // Reference common.js to check out these registrations.
  browser.click('#trackFingerprint');

  browser.pause(1000);

  var error = browser.getText('#fingerprintError');
  if (error) throw new Error(error);
}

function checkTrackingEventsDoNotError() {
  // We have hooked up the #track, #trackPage, #trackLogin and #trackLogout buttons to call
  // their respective ravelinjs functions,  and provided a callback that writes any errors to #trackingError.
  // No text in #trackingError means no error occured fingerprinting the device.
  // Reference common.js to check out these registrations.
  var buttons = ['', 'Page', 'Login', 'Logout'];

  for (var i = 0; i < buttons.length; i++) {
    browser.click('#track' + buttons[i]);

    browser.pause(1000);

    var error = browser.getText('#trackingError');
    if (error) throw new Error(error);
  }
}

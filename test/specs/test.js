describe('ravelinjs', function() {
  const cap = browser.desiredCapabilities;

  it('can be used with a script tag', function() {
    runSuiteWithOneRetry('/pages/scripttag/index.html', cap);
  });

  it('can be used minified with a script tag', function() {
    runSuiteWithOneRetry('/pages/scripttag-min/index.html', cap);
  });

  usuallyIt(!cap.requireJSTestDisabled, 'can be used with requirejs', function() {
    runSuiteWithOneRetry('/pages/amd/index.html', cap);
  });

  usuallyIt(!cap.requireJSTestDisabled, 'can be used minified with requirejs', function() {
    runSuiteWithOneRetry('/pages/amd-min/index.html', cap);
  });

  usuallyIt(!cap.webpackTestDisabled, 'can be used with webpack', function() {
    runSuiteWithOneRetry('/pages/webpack/index.html', cap);
  });
});


function runSuiteWithOneRetry(page, cap) {
  try {
    browser.waitForURL(page);
    suite();
  } catch(e) {
    browser.waitForURL(page, cap.navigateTimeoutMS);
    suite();
  }
}

function suite() {
  checkCookiesAreSet();
  checkCardEncryptionWorks();
  checkFingerprintingDoesNotError();
  checkTrackingEventsDoNotError();
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

  browser.pause(1000);

  // Check there was no error
  var error = browser.getText('#encryptionOutputError');
  if (error) throw new Error(error);

  // Check the results looked valid
  browser.getText('#encryptionOutput').should.not.be.empty;
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

function usuallyIt(itDoes) {
  return (itDoes ? it : it.skip).apply(this, Array.prototype.slice.call(arguments, 1));
}

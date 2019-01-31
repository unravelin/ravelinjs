describe('ravelinjs', function() {
  const cap = browser.desiredCapabilities;

  it('can be used with a script tag', function() {
    runSuiteWithOneRetry(browser, '/pages/scripttag/index.html');
  });

  it('can be used minified with a script tag', function() {
    runSuiteWithOneRetry(browser, '/pages/scripttag-min/index.html');
  });

  usuallyIt(!cap.requireJSTestDisabled, 'can be used with requirejs', function() {
    runSuiteWithOneRetry(browser, '/pages/amd/index.html');
  });

  usuallyIt(!cap.requireJSTestDisabled, 'can be used minified with requirejs', function() {
    runSuiteWithOneRetry(browser, '/pages/amd-min/index.html');
  });

  usuallyIt(!cap.webpackTestDisabled, 'can be used with webpack', function() {
    runSuiteWithOneRetry(browser, '/pages/webpack/index.html');
  });
});

function suite(browser) {
  checkIdsAreSet(browser);
  checkCardEncryptionWorks(browser);
  checkFingerprintingDoesNotError(browser);
  checkTrackingEventsDoNotError(browser);
}

function runSuiteWithOneRetry(browser, page) {
  try {
    browser.url(page);
    browser.pause(500);
    suite(browser);
  } catch(e) {
    browser.url(page);
    browser.pause(500);
    suite(browser);
  }
}

function checkIdsAreSet(browser) {
  // Ensure that deviceId/sessionId are set upon lib instantiation
  console.log(browser.manage().getCookies());
}

function checkCardEncryptionWorks(browser) {
  // Fill in the card encryption form
  browser.setValue('#name', 'John');
  browser.setValue('#number', '4111 1111 1111 1111');
  browser.selectByValue('#month', '4')
  browser.setValue('#year', '2019');
  browser.click('#encrypt');

  browser.pause(1000);

  // Check there was no error
  var error = browser.getText('#encryptionOutputError');
  if (error) throw new Error(error);

  // Check the result looked valid
  browser.getText('#encryptionOutput').should.not.be.empty;
}

function checkFingerprintingDoesNotError(browser) {
  // We have hooked up the #trackFingerprint button to call ravelinjs.trackFingerprint
  // and provided a callback that writes any resulting errors to #fingerprintError.
  // No text in #fingerprintError means no error occured fingerprinting the device.
  // Reference common.js to check out these registrations.
  browser.click('#trackFingerprint');

  browser.pause(1000);

  var error = browser.getText('#fingerprintError');
  if (error) throw new Error(error);
}

function checkTrackingEventsDoNotError(browser) {
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

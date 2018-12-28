describe('ravelinjs', function() {
  const cap = browser.desiredCapabilities;

  it('can be used with a script tag', function() {
    browser.url('/pages/scripttag/index.html');
    suite(browser);
  });

  it('can be used minified with a script tag', function() {
    browser.url('/pages/scripttag-min/index.html');
    suite(browser);
  });

  usuallyIt(!cap.requireJSTestDisabled, 'can be used with requirejs', function() {
    browser.url('/pages/amd/index.html');
    suite(browser);
  });

  usuallyIt(!cap.requireJSTestDisabled, 'can be used minified with requirejs', function() {
    browser.url('/pages/amd-min/index.html');
    suite(browser);
  });

  usuallyIt(!cap.webpackTestDisabled, 'can be used with webpack', function() {
    browser.url('/pages/webpack/index.html');
    suite(browser);
  });
});

function suite(browser) {
  checkIdsAreSet(browser);
  checkCardEncryptionWorks(browser);
  checkFingerprintingDoesNotError(browser);
}

function checkIdsAreSet(browser) {
  // Ensure that deviceId/sessionId are set upon lib instantiation
  browser.getText('#deviceId').should.not.be.empty;
  browser.getText('#sessionId').should.not.be.empty;
  browser.getText('#cookies').should.not.be.empty;
}

function checkCardEncryptionWorks(browser) {
  // Fill in the card encryption form.
  browser.setValue('#name', 'John');
  browser.setValue('#number', '4111 1111 1111 1111');
  browser.selectByValue('#month', '4')
  browser.setValue('#year', '2019');
  browser.click('#encrypt');

  // Check there was no error.
  var error = browser.getText('#encryptionOutputError');
  if (error) throw new Error(error);

  // Check the result looked valid.
  browser.getText('#encryptionOutput').should.not.be.empty;
}

function checkFingerprintingDoesNotError(browser) {
  browser.click('#trackFingerprint');

  // Check there was no error.
  var error = browser.getText('#fingerprintError');
  if (error) throw new Error(error);
}

function usuallyIt(itDoes) {
  return (itDoes ? it : it.skip).apply(this, Array.prototype.slice.call(arguments, 1));
}

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

function suite(browser) {
    // Fill in the card encryption form
    browser.setValue('#name', 'John');
    browser.setValue('#number', '4111 1111 1111 1111');
    browser.selectByValue('#month', '4')
    browser.setValue('#year', '2019');
    browser.click('#encrypt');

    // Check there was no error
    var error = browser.getText('#encryptionOutputError');
    if (error) throw new Error(error);

    // Check the result looked valid
    browser.getText('#encryptionOutput').should.not.be.empty;
}

function usuallyIt(itDoes) {
    return (itDoes ? it : it.skip).apply(this, Array.prototype.slice.call(arguments, 1));
}

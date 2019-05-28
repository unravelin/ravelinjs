describe('ravelinjs', function() {
    const cap = browser.desiredCapabilities;

    it('can be used with a script tag', function() {
        browser.waitForURL('/pages/scripttag/index.html', cap.navigateTimeoutMS);
        suite(browser);
    });

    it('can be used minified with a script tag', function() {
        browser.waitForURL('/pages/scripttag-min/index.html', cap.navigateTimeoutMS);
        suite(browser);
    });

    usuallyIt(!cap.requireJSTestDisabled, 'can be used with requirejs', function() {
        browser.waitForURL('/pages/amd/index.html', cap.navigateTimeoutMS);
        suite(browser);
    });

    usuallyIt(!cap.requireJSTestDisabled, 'can be used minified with requirejs', function() {
        browser.waitForURL('/pages/amd-min/index.html', cap.navigateTimeoutMS);
        suite(browser);
    });

    usuallyIt(!cap.webpackTestDisabled, 'can be used with webpack', function() {
        browser.waitForURL('/pages/webpack/index.html', cap.navigateTimeoutMS);
        suite(browser);
    });
});

function suite(browser) {
    // Wait for the page to load.
    $('#name').waitForExist(cap.renderTimeoutMS);

    // Do the form.
    browser.setValue('#name', 'John');
    browser.setValue('#number', '4111 1111 1111 1111');
    browser.selectByValue('#month', '4')
    browser.setValue('#year', '2019');
    browser.click('#update');

    // Check there was no error.
    var error = browser.getText('#output-error');
    if (error) throw new Error(error);

    // Check the result looked valid.
    browser.getText('#output').should.not.be.empty;
}

function usuallyIt(itDoes) {
    return (itDoes ? it : it.skip).apply(this, Array.prototype.slice.call(arguments, 1));
}

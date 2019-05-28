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
    // Ensure the page has loaded.
    $('#never-found').waitForExist();

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

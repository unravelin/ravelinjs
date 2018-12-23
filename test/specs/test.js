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
  // Ensure that deviceId/sessionId are set upon lib instantiation
  browser.getValue('#deviceId').should.not.be.empty;
  browser.getValue('#sessionId').should.not.be.empty;
  browser.getValue('#cookies').should.not.be.empty;

  // Do the form.
  browser.setValue('#name', 'John');
  browser.setValue('#number', '4111 1111 1111 1111');
  browser.selectByValue('#month', '4')
  browser.setValue('#year', '2019');
  browser.click('#encrypt');

  // Check there was no error.
  var error = browser.getText('#encryption-output-error');
  if (error) throw new Error(error);

  // Check the result looked valid.
  browser.getText('#encryption-output').should.not.be.empty;
}

function usuallyIt(itDoes) {
  return (itDoes ? it : it.skip).apply(this, Array.prototype.slice.call(arguments, 1));
}

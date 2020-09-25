describe('ravelinjs unit tests', function() {
  it('passes', function() {
    browser.url('/unit/');
    expect(browser).toHaveTitleContaining('Mocha');
    browser.waitUntil(function() {
      // The unit test page will assign this ID to an element when the final
      // test has run.
      return !!$('#completed');
    });

    // See if we got any errors.
    var stats = $('#mocha-stats').getText().replace(/(\d)([fd])/g, '$1, $2');
    if (stats.indexOf('failures: 0,') !== -1) {
      return;
    }

    // Report back errors.
    var failures = $('#completed pre.error').getText();
    throw new Error('Stats: ' + stats + '. ' + failures);
  });
});

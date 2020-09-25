const { navigate } = require('../common.spec.js');

describe('ravelinjs unit tests', function() {
  it('passes', function() {
    navigate(browser, 'Mocha', '/unit/', process.env.TEST_REMOTE + '/unit/');
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

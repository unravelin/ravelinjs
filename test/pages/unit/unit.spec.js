/* globals describe, it, browser, expect, $ */

describe('ravelinjs unit tests', function() {
  it('passes', function() {
    browser.url('/pages/unit/');
    expect(browser).toHaveTitleContaining('Mocha');

    browser.waitUntil(function() {
      return $('#mocha-stats .duration').getText() !== 'duration: 0';
    });

    var nErr = $('#mocha-stats .failures').getText();
    if (nErr !== 'failures: 0') {
      throw new Error('Unit tests found ' + nErr);
    }
  });
});

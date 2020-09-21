describe('ravelinjs unit tests', function() {
  it('passes', function() {
    browser.url('/unit/');
    expect(browser).toHaveTitleContaining('Mocha');

    browser.waitUntil(function() {
      return $('#mocha-stats .duration').getText() !== 'duration: 0';
    });

    var stats = $('#mocha-stats').getText();
    if (stats.indexOf('failures: 0') === -1) {
      throw new Error('Stats: ' + stats.replace(/(\d)([fd])/g, '$1, $2'));
    }
  });
});

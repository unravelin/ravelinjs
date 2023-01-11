describe('ravelinjs unit tests', function() {
  it('passes', async function() {
    await browser.url('/unit/');

    // Wait for the
    const complete = await $('#completed');
    await complete.waitForExist({timeout: 30000}); // IE can be very slow.

    // See if we got any errors.
    const stats = (await $('#mocha-stats').getText()).replace(/(\d)([fd])/g, '$1, $2');
    if (stats.indexOf('failures: 0,') !== -1) {
      return;
    }

    // Report back errors.
    const failures = await $('#completed pre.error').getText();
    throw new Error('Stats: ' + stats + '. ' + failures);
  });
});

import { navigate, hasTitle, hasElement } from '../common.spec.mjs';

describe('ravelinjs unit tests', function() {
  it('passes', async function() {
    await navigate(browser, {
      attempts: 3,
      url: '/unit/',
      tests: [
        // Wait for the page to load.
        hasTitle('Mocha'), hasElement('#mocha-stats'),
        // The unit test page will assign this ID to an element when the final
        // test has run.
        hasElement('#completed'),
      ],
    });

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

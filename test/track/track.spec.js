// const log = require('@wdio/logger').default('track.spec');
const { navigate, hasTitle, hasElement } = require('../common.spec.js');
const { expectRequest } = require('../server');

describe('ravelinjs.track', function() {
  it('sends page-load events', function() {
    const key = browser.sessionId;

    // Visit `${page}/send/?api=${api}&key=${key}&msg=${msg}`.
    navigate(browser, {
      attempts: 3,
      url: '/track/?key=' + encodeURIComponent(key),
      tests: [
        // Confirm the page has loaded.
        hasTitle('track'), hasElement('#output'),
        // Wait for the test to complete.
        hasElement('#completed'),
      ],
    });

    // Check whether the browser reported any errors.
    const e = $('#error').getText();
    if (e) throw new Error(e);

    // Read the device and session IDs from the cookies.
    const cookies = browser.getCookies();
    const sessionId = cookies.filter(({name}) => name === 'ravelinSessionId')[0].value;
    const deviceId = cookies.filter(({name}) => name === 'ravelinDeviceId')[0].value;
    if (!deviceId.match(/^rjs-/)) {
      throw new Error('Expected cookie ravelinDeviceId to start with "rjs-" but got ' + deviceId);
    }

    // Confirm that we received a page-load event.
    browser.waitUntil(function() {
      return browser.call(
        () => expectRequest(process.env.TEST_INTERNAL, {
          path: '/z',
          query: {key: key},
          "bodyJSON.events": {"$elemMatch": {
            eventType: 'PAGE_LOADED',
            eventData: {eventName: "track"},
            "eventMeta.url": {"$regex": "^https?://.+/track/.*"},
            "eventMeta.trackingSource": "browser",
            "eventMeta.pageTitle": "track test",
            "eventMeta.clientEventTimeMilliseconds": {"$gt": 1601315328222},
            "eventMeta.ravelinDeviceId": deviceId,
            "eventMeta.ravelinSessionId": sessionId,
            "eventMeta.ravelinWindowId": {"$regex": "^[0-9a-z-]{36}$"}
          }}
        })
      );
    });
  });
});

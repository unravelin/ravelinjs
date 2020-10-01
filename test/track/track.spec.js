// const log = require('@wdio/logger').default('track.spec');
const { navigate, hasTitle, hasElement, objDiff } = require('../common.spec.js');
const { fetchRequest } = require('../server');

describe('ravelinjs.track', function() {
  it('loads', function() {
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
  });

  it('sends page-load events', function() {
    const key = browser.sessionId;

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
        () => fetchRequest(process.env.TEST_INTERNAL, {
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

  it('sends paste non-pan text', function() {
    if (browser.capabilities.skipPasteEventTest) {
      this.skip();
    }

    const key = browser.sessionId;

    const cookies = browser.getCookies();
    const sessionId = cookies.filter(({name}) => name === 'ravelinSessionId')[0].value;
    const deviceId = cookies.filter(({name}) => name === 'ravelinDeviceId')[0].value;

    const e = $('#in-tracked');
    e.clearValue();
    pasteInto(e, 'h3ll0, world');

    // Confirm that we received a page-load event.
    let pasteEvent;
    browser.waitUntil(function() {
      pasteEvent = browser.call(
        () => fetchRequest(process.env.TEST_INTERNAL, {
          method: 'POST',
          path: '/z',
          query: {key: key},
          "bodyJSON.events": {"$elemMatch": {
            eventType: 'paste',
            "eventData.properties.fieldName": "name",
          }}
        })
      );
      return !!pasteEvent;
    });

    objDiff(
      pasteEvent.bodyJSON.events[0],
      {
        eventType: 'paste',
        eventData: {
          eventName: "paste",
          properties: {
              fieldName: "name",
              formName: "cardForm",
              formAction: "/form-action",
              selectionStart: 0,
              selectionEnd: 0,
              panCleaned: false,
              pastedValue: "X0XX0, XXXXX"
          }
        },
        eventMeta: {
          trackingSource: "browser",
          pageTitle: "track test",
          ravelinDeviceId: deviceId,
          ravelinSessionId: sessionId,
          // url: {"$regex": "^https?://.+/track/.*"},
          // clientEventTimeMilliseconds: {"$gt": 1601315328222},
          // ravelinWindowId: {"$regex": "^[0-9a-z-]{36}$"}
        }
      },
      'Validating paste event'
    );
  });
});

function pasteInto(e, text) {
  // Write into <input id=clip-stage onclick=this.select()> then copy out.
  const c = $('#clip-stage');
  c.setValue(text);
  c.click();
  c.addValue(['Control', 'Insert']);

  // Paste into the element at selector.
  e.click();
  e.addValue(['Shift', 'Insert']);
}

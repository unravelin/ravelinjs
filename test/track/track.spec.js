const log = require('@wdio/logger').default('track.spec');
const { navigate, hasTitle, hasElement, objDiff } = require('../common.spec.js');
const { fetchRequest } = require('../server');

describe('ravelin.track', function () {
  var key;
  var sessionId, deviceId;

  it('loads', function () {
    key = browser.sessionId;

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

  it('sends page-load events', function () {
    // Read the device and session IDs from the cookies.
    const cookies = browser.getCookies();
    sessionId = cookies.filter(({ name }) => name === 'ravelinSessionId')[0].value;
    deviceId = cookies.filter(({ name }) => name === 'ravelinDeviceId')[0].value;
    if (!deviceId.match(/^rjs-/)) {
      throw new Error('Expected cookie ravelinDeviceId to start with "rjs-" but got ' + deviceId);
    }

    // Confirm that we received a page-load event.
    let loadEvent;
    browser.waitUntil(function () {
      loadEvent = browser.call(
        () => fetchRequest(process.env.TEST_INTERNAL, {
          path: '/z',
          query: { key: key },
          "bodyJSON.events": {
            "$elemMatch": {
              eventType: 'PAGE_LOADED',
            }
          }
        })
      );
      return !!loadEvent;
    });
    objDiff(
      loadEvent.bodyJSON.events[0],
      {
        eventType: 'PAGE_LOADED',
        eventData: { eventName: "track" },
        eventMeta: {
          trackingSource: "browser",
          pageTitle: "track test",
          ravelinDeviceId: deviceId,
          ravelinSessionId: sessionId,
          // "url": {"$regex": "^https?://.+/track/.*"},
          // "clientEventTimeMilliseconds": {"$gt": 1601315328222},
          // "ravelinWindowId": {"$regex": "^[0-9a-z-]{36}$"}
        },
      },
      'Validating page load event'
    );
  });

  it('sends redacted paste events of pan text', function () {
    // Write into <input id=clip-stage onclick=this.select()> then copy out.
    const c = $('#clip-stage');
    c.setValue('4111 1111 1111 1111');
    c.click();
    c.addValue(["Control", "Insert"]);

    // Paste into <input name=name id=in-tracked />
    const e = $('#in-pan');
    e.clearValue();
    e.click();
    e.addValue(["Shift", "Insert"]);

    // Check if the paste worked.
    if (e.getValue() != "") {
      log.warn('Copy-paste failed so skipping all paste tests. ' + browser.sessionId);
      this.skip();
    }

    // Fetch the paste event we shared.
    let pasteEvent;
    browser.waitUntil(function () {
      pasteEvent = browser.call(
        () => fetchRequest(process.env.TEST_INTERNAL, {
          method: 'POST',
          path: '/z',
          query: { key: key },
          "bodyJSON.events": {
            "$elemMatch": {
              eventType: 'paste',
              "eventData.properties.fieldName": "name",
            }
          }
        })
      );
      return !!pasteEvent;
    });

    // Confirm the paste event has the properties we want.
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
            panCleaned: true,
            pastedValue: "0000 0000 0000 0000"
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

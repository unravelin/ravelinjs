import { Key } from 'webdriverio'
import wdio from '@wdio/logger';
import { navigate, hasTitle, hasElement, objDiff } from '../common.spec.js';
import { fetchRequest } from '../server.js';

const log = wdio('track.spec');

describe('ravelin.track', function () {
  var key;
  var sessionId, deviceId;

  it('loads', async function () {
    key = browser.sessionId;

    // Visit `${page}/send/?api=${api}&key=${key}&msg=${msg}`.
    await navigate(browser, {
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
    const e = await $('#error').getText();
    if (e) throw new Error(e);
  });

  it('sends page-load events', async function () {
    // Read the device and session IDs from the cookies.
    const cookies = await browser.getCookies();
    sessionId = cookies.filter(({ name }) => name === 'ravelinSessionId')[0].value.replace(/^.+?:/, '');
    deviceId = cookies.filter(({ name }) => name === 'ravelinDeviceId')[0].value;
    if (!deviceId.match(/^rjs-/)) {
      throw new Error('Expected cookie ravelinDeviceId to start with "rjs-" but got ' + deviceId);
    }

    // Confirm that we received a page-load event.
    let loadEvent;
    await browser.waitUntil(async function () {
      loadEvent = await browser.call(
        () => fetchRequest(process.env.TEST_INTERNAL, {
          path: '/z',
          query: { key: key },
          "bodyJSON.events": {
            "$elemMatch": {
              eventData: {eventName: 'PAGE_LOADED'},
            }
          }
        })
      );
      return !!loadEvent;
    });
    objDiff(
      loadEvent.bodyJSON.events[0],
      {
        eventType: 'track',
        eventData: { eventName: 'PAGE_LOADED' },
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

  it('sends redacted paste events of pan text', async function () {
    const fakePAN = '4111 1111 1111 1111';

    // Write into <input id=clip-stage onclick=this.select()> then copy out.
    const c = await $('#clip-stage');
    await c.setValue(fakePAN);
    await c.click();
    try {
      await browser.keys(['Control', 'Insert']);
    } catch(e) {
      // TODO: iOS is refusing to let us send key.
      log.warn('Failed to send control+insert keypress so skipping ' + browser.sessionId + '. Error: ' + e.toString());
      this.skip();
    }

    // Paste into <input name=name id=in-tracked />
    const e = $('#in-pan');
    await e.clearValue();
    await e.click();
    await browser.keys(['Shift', 'Insert']);

    // Check if the paste worked.
    if (await e.getValue() === "") {
      log.warn('Copy-paste failed so skipping all paste tests. ' + browser.sessionId);
      this.skip();
    }

    // Fetch the paste event we shared.
    let pasteEvent;
    await browser.waitUntil(async function () {
      pasteEvent = await browser.call(
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

    const props = {
      fieldName: "name",
      formName: "cardForm",
      formAction: "/form-action",
      selectionStart: 0,
      selectionEnd: 0,
    };
    if (browser.capabilities.browserName != 'internet explorer') {
      // A dirty hack to detect when clipboardData is unavailable on the client.
      // Seems that IE's use of selenium3 prevents us from injecting values from
      // wdio.conf.js into browser.capabilities. ¯\_(ツ)_/¯
      props.panCleaned = true;
      props.pastedValue = "0000 0000 0000 0000";
    }

    // Confirm the paste event has the properties we want.
    objDiff(
      pasteEvent.bodyJSON.events[0],
      {
        eventType: 'paste',
        eventData: {
          eventName: "paste",
          properties: props
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

  it('sends resize events', async function() {
    try {
      // Make the browser smaller.
      var d1 = await browser.getWindowSize();
      await browser.setWindowSize(d1.width - 10, d1.height - 10);
      var d2 = await browser.getWindowSize();

      if (d1.width == d2.width && d1.height == d2.height) {
        log.warn('Resizing the browser had no effect. Skipping test.');
        this.skip();
      }
    } catch (e) {
      log.warn('Resizing the browser failed. Skipping test. ' + e.toString());
      this.skip();
    }

    // Validate that we got an event of the expected format.
    let resizeEvent;
    await browser.waitUntil(async function () {
      resizeEvent = await browser.call(
        () => fetchRequest(process.env.TEST_INTERNAL, {
          method: 'POST',
          path: '/z',
          query: { key: key },
          "bodyJSON.events": {
            "$elemMatch": {
              eventType: 'resize',
            }
          }
        })
      );
      return !!resizeEvent;
    });
    objDiff(
      resizeEvent.bodyJSON.events[0],
      {
        eventType: 'resize',
        eventData: {
          eventName: "resize"
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
      'Validating resize event'
    );
    const props = resizeEvent.bodyJSON.events[0].eventData.properties;
    checkDim(props, 'resolutionOld');
    checkDim(props, 'resolutionNew');

    function checkDim(props, d) {
      if (!props.hasOwnProperty(d)) {
        throw new ReferenceError('properties has no dimension ' + d);
      }
      var dim = props[d];
      if (typeof dim.w !== 'number') throw new TypeError('Expected ' + d + '.w to be a number but it is ' + typeof dim.w);
      if (typeof dim.h !== 'number') throw new TypeError('Expected ' + d + '.h to be a number but it is ' + typeof dim.h);
    }
  });
});

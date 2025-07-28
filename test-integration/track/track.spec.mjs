import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import {
  buildDriver,
  buildUrl,
  fetchRequestLog,
  hasElement,
  hasTitle,
  navigate,
} from '../utils.mjs';

describe('ravelinjs.track', () => {
  /** @type {import('selenium-webdriver').WebDriver} */
  let driver;
  /** @type {string} */
  let key;
  /** @type {string} */
  let sessionId;
  /** @type {string} */
  let deviceId;

  before(async () => {
    driver = buildDriver();
    key = (await driver.getSession()).getId();
  });

  after(async () => {
    await driver.quit();
  });

  it('loads', async () => {
    // Visit `/track/?key=${key}`.
    await navigate(driver, {
      url: buildUrl({ path: '/track', queryParams: { key } }),
      tests: [
        // Confirm the page has loaded.
        hasTitle('track'),
        hasElement('output'),
        // Wait for the test to complete.
        hasElement('completed'),
      ],
    });

    // Check whether the browser reported any errors.
    const error = await driver.findElement(By.id('error'));
    const errorText = await error.getText();
    if (errorText) {
      throw new Error(`Error in test: ${errorText}`);
    }
  });

  it('sends page-load events', async () => {
    const sessionIdCookie = await driver.manage().getCookie('ravelinSessionId');
    const deviceIdCookie = await driver.manage().getCookie('ravelinDeviceId');

    expect(sessionIdCookie).to.be.an('object');
    expect(deviceIdCookie).to.be.an('object');

    sessionId = sessionIdCookie.value.replace(/^.+?:/, '');
    deviceId = deviceIdCookie.value;

    if (!deviceId.match(/^rjs-/)) {
      throw new Error(`Expected cookie ravelinDeviceId to start with "rjs-" but got "${deviceId}"`);
    }

    // Confirm that we received a page-load event.
    let loadEvent;
    await driver.wait(async () => {
      loadEvent = await fetchRequestLog({
        path: '/z',
        query: { key },
        'bodyJSON.events': {
          $elemMatch: {
            eventData: { eventName: 'PAGE_LOADED' },
          },
        },
      });
      return !!loadEvent;
    });

    expect(loadEvent).to.exist;
    expect(loadEvent.bodyJSON.events[0]).to.deep.include({
      eventType: 'track',
      eventData: { eventName: 'PAGE_LOADED' },
      eventMeta: {
        trackingSource: 'browser',
        pageTitle: 'track test',
        ravelinDeviceId: deviceId,
        ravelinSessionId: sessionId,
        // "url": {"$regex": "^https?://.+/track/.*"},
        // "clientEventTimeMilliseconds": {"$gt": 1601315328222},
        // "ravelinWindowId": {"$regex": "^[0-9a-z-]{36}$"}
      },
    });
  });
});

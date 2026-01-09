import { expect } from 'chai';
import { By, Key } from 'selenium-webdriver';
// import { $, browser } from '@wdio/globals';
// import { Key } from 'webdriverio';
import {
  buildDriver,
  buildUrl,
  fetchRequestLog,
  getCurrentPlatform,
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

  // before(() => {
  //   key = browser.sessionId;
  // });

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
    // const error = await $('#error');
    const errorText = await error.getText();
    if (errorText) {
      throw new Error(`Error in test: ${errorText}`);
    }
  });

  it('sends page-load events', async () => {
    const cookies = await driver.manage().getCookies();
    // const cookies = await browser.getCookies();

    const sessionIdCookie = cookies.find((c) => c.name === 'ravelinSessionId');
    const deviceIdCookie = cookies.find((c) => c.name === 'ravelinDeviceId');

    expect(sessionIdCookie).to.be.an('object');
    expect(deviceIdCookie).to.be.an('object');

    // Remove the device ID prefix from the session ID cookie value.
    // E.g. `rjs-abc:xyz` becomes `xyz`
    sessionId = sessionIdCookie.value.replace(/^.+?:/, '');
    deviceId = deviceIdCookie.value;

    expect(deviceId).to.match(
      /^rjs-/,
      `Expected cookie ravelinDeviceId to start with "rjs-" but got "${deviceId}"`
    );

    // Confirm that we received a page-load event.
    const loadEvent = await fetchRequestLog(driver, {
      path: '/z',
      query: { key },
      'bodyJSON.events': {
        $elemMatch: {
          eventData: { eventName: 'PAGE_LOADED' },
        },
      },
    });

    expect(loadEvent).to.exist;
    expect(loadEvent.bodyJSON.events).to.have.length(1);
    expect(loadEvent.bodyJSON.events[0]).to.containSubset({
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

  it('sends redacted paste events of pan text', async () => {
    const fakePAN = '4111 1111 1111 1111';

    const platform = getCurrentPlatform();
    // const platform = browser.capabilities;

    // console.log(`Debug platform: ${platform.platformName} - ${platform.browserName}`);

    const modifierKey = platform.os === 'OS X' ? Key.COMMAND : Key.CONTROL;
    // const os = platform.platformName?.toLowerCase() || '';
    // const modifierKey = os.includes('macos') || os.includes('ios') ? Key.Command : Key.Control;

    // Write into <input id="clip-stage" /> then copy out
    const clipStage = await driver.findElement(By.id('clip-stage'));
    // const clipStage = await $('#clip-stage');

    // Move mouse to the input and click it
    await clipStage.click();
    await clipStage.sendKeys(fakePAN);
    // await clipStage.moveTo();
    // await clipStage.click();
    // await browser.keys(fakePAN);

    // await browser.keys([Key.Ctrl, 'a']);
    // await browser.keys([Key.Ctrl, 'c']);

    // Select all text and copy to clipboard.
    // Note: Safari fails to register shortcuts when using `sendKeys` directly
    // so we need to manually manage the key presses instead.
    if (platform.deviceName?.toLowerCase().includes('iphone')) {
      console.log('iPhone detected, skipping copy text.');
    } else if (platform.browserName.toLowerCase() === 'safari') {
      await clipStage.click();
      await driver.actions().keyDown(modifierKey).sendKeys('a').keyUp(modifierKey).perform();
      await driver.actions().keyDown(modifierKey).sendKeys('c').keyUp(modifierKey).perform();

      //   await browser
      //     .action('key')
      //     .down(modifierKey)
      //     .down('a')
      //     .pause(10)
      //     .up('a')
      //     .up(modifierKey)
      //     .perform();
      //   await browser
      //     .action('key')
      //     .down(modifierKey)
      //     .down('c')
      //     .pause(10)
      //     .up('c')
      //     .up(modifierKey)
      //     .perform();
    } else {
      await clipStage.sendKeys(Key.chord(modifierKey, 'a'));
      await clipStage.sendKeys(Key.chord(modifierKey, 'c'));

      // await clipStage.sendKeys([modifierKey, 'a']);
      // await clipStage.sendKeys([modifierKey, 'c']);
    }

    // Paste into <input name="name" id="in-pan" />
    const inTracked = await driver.findElement(By.id('in-pan'));
    // const inTracked = await $('#in-pan');

    // Move mouse to the input and click it
    // await inTracked.moveTo();
    // await inTracked.click();

    // await browser.keys([Key.Ctrl, 'v']);

    // Note: Safari fails to register shortcuts when using `sendKeys` directly
    // so we need to manually manage the key presses instead.
    if (platform.deviceName?.toLowerCase().includes('iphone')) {
      console.log('iPhone detected, using execScript to paste text.');
      await driver.executeScript(
        (el, text) => {
          // Create the DataTransfer object to hold the clipboard data
          const dt = new DataTransfer();
          dt.setData('text/plain', text);

          // Create the Paste Event
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt,
          });

          // Dispatch the event (triggers RavelinJS onPaste listener)
          el.dispatchEvent(pasteEvent);
          // Set the value directly as paste event is fake
          el.value = text;
        },
        inTracked,
        fakePAN
      );
    } else if (platform.browserName.toLowerCase() === 'safari') {
      // Move mouse to the input and click it
      // await driver.actions().move({ origin: inTracked }).perform();
      await inTracked.click();
      await inTracked.sendKeys('');
      await driver.actions().keyDown(modifierKey).sendKeys('v').keyUp(modifierKey).perform();

      //   await browser
      //     .action('key')
      //     .down(modifierKey)
      //     .down('v')
      //     .pause(10)
      //     .up('v')
      //     .up(modifierKey)
      //     .perform();
    } else {
      await inTracked.click();
      await inTracked.sendKeys('');
      await inTracked.sendKeys(Key.chord(modifierKey, 'v'));

      // await inTracked.sendKeys([modifierKey, 'v']);
    }

    // Check if the paste worked
    let pastedValue = await inTracked.getAttribute('value');
    // let pastedValue = await inTracked.getValue();

    // Try one more time
    if (pastedValue === '') {
      console.log('Paste failed, trying again.', platform);
      await inTracked.clear();
      // await inTracked.click();

      // await browser.keys([Key.Ctrl, 'v']);

      if (platform.deviceName?.toLowerCase().includes('iphone')) {
        console.log('iPhone detected, using execScript to paste text 2.');
        await driver.executeScript(
          (el, text) => {
            // Create the DataTransfer object to hold the clipboard data
            const dt = new DataTransfer();
            dt.setData('text/plain', text);

            // Create the Paste Event
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: dt,
            });

            // Dispatch the event (triggers RavelinJS onPaste listener)
            el.dispatchEvent(pasteEvent);
            // Set the value directly as paste event is fake
            el.value = text;
          },
          inTracked,
          fakePAN
        );
      } else if (platform.browserName.toLowerCase() === 'safari') {
        // Move mouse to the input and click it
        // await driver.actions().move({ origin: inTracked }).perform();
        await inTracked.click();
        await inTracked.sendKeys('');
        await driver.actions().keyDown(modifierKey).sendKeys('v').keyUp(modifierKey).perform();
        // await browser
        //   .action('key')
        //   .down(modifierKey)
        //   .down('v')
        //   .pause(10)
        //   .up('v')
        //   .up(modifierKey)
        //   .perform();
      } else {
        await inTracked.click();
        await inTracked.sendKeys(Key.chord(modifierKey, 'v'));

        // await inTracked.sendKeys([modifierKey, 'v']);
      }
    }

    pastedValue = await inTracked.getAttribute('value');
    // pastedValue = await inTracked.getValue();

    if (pastedValue === '') {
      throw new Error('Failed to paste value into input, got empty string.');
    }

    // Fetch the paste event we shared
    const pasteEvent = await fetchRequestLog(driver, {
      path: '/z',
      query: { key },
      'bodyJSON.events': {
        $elemMatch: {
          eventType: 'paste',
          'eventData.properties.fieldName': 'name',
        },
      },
    });

    // clipboardData is unavailable in IE 11, so RavelinJS returns nothing
    const expectedValue =
      platform.browserName.toLowerCase() === 'internet explorer'
        ? undefined
        : '0000 0000 0000 0000';

    expect(pasteEvent).to.exist;
    expect(pasteEvent.bodyJSON.events).to.have.length(1);
    expect(pasteEvent.bodyJSON.events[0]).to.containSubset({
      eventType: 'paste',
      eventData: {
        properties: {
          fieldName: 'name',
          formName: 'cardForm',
          formAction: '/form-action',
          panCleaned: true,
          pastedValue: expectedValue,
          selectionStart: 0,
          selectionEnd: 0,
        },
      },
      eventMeta: {
        trackingSource: 'browser',
        pageTitle: 'track test',
        ravelinDeviceId: deviceId,
        ravelinSessionId: sessionId,
        // "url": {"$regex": "^https?://.+/track/.*"},
        // "clientEventTimeMilliseconds": {"$gt": 1601315328222},
        // ravelinWindowId: {"$regex": "^[0-9a-z-]{36}$"}
      },
    });
  });

  // it('sends resize events', async function () {
  //   const platform = getCurrentPlatform();
  //   const window = driver.manage().window();

  //   // Resize the window smaller
  //   const r1 = await window.getRect();

  //   try {
  //     await window.setRect({ width: r1.width - 10, height: r1.height - 10 });
  //   } catch {
  //     // Handle unsupported platforms after checking the size again
  //   }

  //   const r2 = await window.getRect();

  //   // If no resize occurred
  //   if (r1.width === r2.width && r1.height === r2.height) {
  //     // Resize events are not supported on mobile devices, skip test
  //     if (platform.deviceName) {
  //       console.warn('Resize events are not supported on mobile devices, skipping test.');
  //       this.skip();
  //       return;
  //     } else {
  //       throw new Error('Resize event did not change window size.');
  //     }
  //   }

  //   // Wait for the resize event to be processed
  //   await driver.sleep(100);

  //   // Validate that we got an event in the expected format
  //   const resizeEvent = await fetchRequestLog(driver, {
  //     path: '/z',
  //     query: { key },
  //     'bodyJSON.events': {
  //       $elemMatch: {
  //         eventType: 'resize',
  //       },
  //     },
  //   });

  //   expect(resizeEvent).to.exist;
  //   expect(resizeEvent.bodyJSON.events).to.have.length(1);
  //   expect(resizeEvent.bodyJSON.events[0]).to.containSubset({
  //     eventType: 'resize',
  //     eventData: {
  //       eventName: 'resize',
  //       properties: {
  //         resolutionOld: { w: r1.width, h: r1.height },
  //         resolutionNew: { w: r2.width, h: r2.height },
  //       },
  //     },
  //     eventMeta: {
  //       trackingSource: 'browser',
  //       pageTitle: 'track test',
  //       ravelinDeviceId: deviceId,
  //       ravelinSessionId: sessionId,
  //       // url: {"$regex": "^https?://.+/track/.*"},
  //       // clientEventTimeMilliseconds: {"$gt": 1601315328222},
  //       // ravelinWindowId: {"$regex": "^[0-9a-z-]{36}$"}
  //     },
  //   });
  // });
});

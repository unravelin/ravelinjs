import { expect } from 'chai';
import { By, Key } from 'selenium-webdriver';
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
    const cookies = await driver.manage().getCookies();

    const sessionIdCookie = cookies.find(c => c.name === 'ravelinSessionId');
    const deviceIdCookie = cookies.find(c => c.name === 'ravelinDeviceId');

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

  it('disables and re-enables tracking', async () => {
    const platform = getCurrentPlatform();

    const modifierKey = platform.os === 'OS X' ? Key.COMMAND : Key.CONTROL;

    // Write into <input id="clip-stage" /> then copy out
    const clipStage = await driver.findElement(By.id('clip-stage'));

    // We need to send multple paste events so wrapping this in a function for reuse.
    async function copyAndPasteText(textToPaste, elementToPasteTo) {
      await clipStage.clear();

      // Move mouse to the input and click it
      await clipStage.click();
      await clipStage.sendKeys(textToPaste);

      // Select all text and copy to clipboard.
      // Note: Safari fails to register shortcuts when using `sendKeys` directly
      // so we need to manually manage the key presses instead.
      if (platform.deviceName?.toLowerCase().includes('iphone')) {
        console.log('iPhone detected, skipping copy text.');
      } else if (platform.browserName.toLowerCase() === 'safari') {
        await clipStage.click();
        await driver.actions().keyDown(modifierKey).sendKeys('a').keyUp(modifierKey).perform();
        await driver.actions().keyDown(modifierKey).sendKeys('c').keyUp(modifierKey).perform();
      } else {
        await clipStage.sendKeys(Key.chord(modifierKey, 'a'));
        await clipStage.sendKeys(Key.chord(modifierKey, 'c'));
      }

      // Paste into the input element
      const inTracked = await driver.findElement(By.id(elementToPasteTo));

      // Move mouse to the input and click it
      if (platform.deviceName?.toLowerCase().includes('iphone')) {
        // On iPhone we have to simulate the paste event via execScript
        // as keyboard shortcuts do not work in Safari mobile.
        /* eslint-disable no-undef */
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
          textToPaste
        );
        /* eslint-enable no-undef */
      } else if (platform.browserName.toLowerCase() === 'safari') {
        // Note: Safari fails to register shortcuts when using `sendKeys` directly
        // so we need to manually manage the key presses instead.
        await inTracked.click();
        await inTracked.sendKeys('');
        await driver.actions().keyDown(modifierKey).sendKeys('v').keyUp(modifierKey).perform();
      } else {
        // Regular Ctrl+V paste for other browsers
        await inTracked.click();
        await inTracked.sendKeys('');
        await inTracked.sendKeys(Key.chord(modifierKey, 'v'));
      }

      // Check if the paste worked
      let pastedValue = await inTracked.getAttribute('value');

      // Try one more time
      if (pastedValue === '') {
        console.log('Paste failed, trying again.', platform);
        await inTracked.clear();

        if (platform.deviceName?.toLowerCase().includes('iphone')) {
          /* eslint-disable no-undef */
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
            textToPaste
          );
          /* eslint-enable no-undef */
        } else if (platform.browserName.toLowerCase() === 'safari') {
          // Note: Safari fails to register shortcuts when using `sendKeys` directly
          // so we need to manually manage the key presses instead.
          await inTracked.click();
          await inTracked.sendKeys('');
          await driver.actions().keyDown(modifierKey).sendKeys('v').keyUp(modifierKey).perform();
        } else {
          // Regular Ctrl+V paste for other browsers
          await inTracked.click();
          await inTracked.sendKeys('');
          await inTracked.sendKeys(Key.chord(modifierKey, 'v'));
        }
      }

      pastedValue = await inTracked.getAttribute('value');

      if (pastedValue === '') {
        throw new Error('Failed to paste value into input, got empty string.');
      }

      return inTracked;
    }

    const testFirstName = 'Peter';
    const testLastName = 'Applehead';

    // Disable tracking
    await driver.executeScript('window.Ravelin.track.disable();');

    // Do the first paste event
    await copyAndPasteText(testFirstName, 'in-fname');

    // Re-enable tracking
    await driver.executeScript('window.Ravelin.track.init();');

    // Do another paste event
    await copyAndPasteText(testLastName, 'in-lname');

    // Fetch the paste event.
    // We are matching based on the formName. If the first name paste event has come
    // through, it will be the first event matched, so the following checks will fail.
    const pasteEvent = await fetchRequestLog(driver, {
      path: '/z',
      query: { key },
      'bodyJSON.events': {
        $elemMatch: {
          eventType: 'paste',
          'eventData.properties.formName': 'nameForm',
        },
      },
    });

    // Ensure that the matched event is for last name field.
    expect(pasteEvent).to.exist;
    expect(pasteEvent.bodyJSON.events).to.have.length(1);
    expect(pasteEvent.bodyJSON.events[0]).to.containSubset({
      eventType: 'paste',
      eventData: {
        properties: {
          fieldName: 'lname',
          formName: 'nameForm',
          formAction: '/form-action',
          pastedValue: 'X'.repeat(testLastName.length),
          selectionStart: 0,
          selectionEnd: 0,
        },
      },
      eventMeta: {
        trackingSource: 'browser',
        pageTitle: 'track test',
        ravelinDeviceId: deviceId,
        ravelinSessionId: sessionId,
      },
    });
  });

  it('sends redacted paste events of pan text', async () => {
    const fakePAN = '4111 1111 1111 1111';

    const platform = getCurrentPlatform();

    const modifierKey = platform.os === 'OS X' ? Key.COMMAND : Key.CONTROL;

    // Write into <input id="clip-stage" /> then copy out
    const clipStage = await driver.findElement(By.id('clip-stage'));
    await clipStage.clear();

    // Move mouse to the input and click it
    await clipStage.click();
    await clipStage.sendKeys(fakePAN);

    // Select all text and copy to clipboard.
    // Note: Safari fails to register shortcuts when using `sendKeys` directly
    // so we need to manually manage the key presses instead.
    if (platform.deviceName?.toLowerCase().includes('iphone')) {
      console.log('iPhone detected, skipping copy text.');
    } else if (platform.browserName.toLowerCase() === 'safari') {
      await clipStage.click();
      await driver.actions().keyDown(modifierKey).sendKeys('a').keyUp(modifierKey).perform();
      await driver.actions().keyDown(modifierKey).sendKeys('c').keyUp(modifierKey).perform();
    } else {
      await clipStage.sendKeys(Key.chord(modifierKey, 'a'));
      await clipStage.sendKeys(Key.chord(modifierKey, 'c'));
    }

    // Paste into <input name="name" id="in-pan" />
    const inTracked = await driver.findElement(By.id('in-pan'));

    // Move mouse to the input and click it
    if (platform.deviceName?.toLowerCase().includes('iphone')) {
      // On iPhone we have to simulate the paste event via execScript
      // as keyboard shortcuts do not work in Safari mobile.
      /* eslint-disable no-undef */
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
      /* eslint-enable no-undef */
    } else if (platform.browserName.toLowerCase() === 'safari') {
      // Note: Safari fails to register shortcuts when using `sendKeys` directly
      // so we need to manually manage the key presses instead.
      await inTracked.click();
      await inTracked.sendKeys('');
      await driver.actions().keyDown(modifierKey).sendKeys('v').keyUp(modifierKey).perform();
    } else {
      // Regular Ctrl+V paste for other browsers
      await inTracked.click();
      await inTracked.sendKeys('');
      await inTracked.sendKeys(Key.chord(modifierKey, 'v'));
    }

    // Check if the paste worked
    let pastedValue = await inTracked.getAttribute('value');

    // Try one more time
    if (pastedValue === '') {
      console.log('Paste failed, trying again.', platform);
      await inTracked.clear();

      if (platform.deviceName?.toLowerCase().includes('iphone')) {
        /* eslint-disable no-undef */
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
        /* eslint-enable no-undef */
      } else if (platform.browserName.toLowerCase() === 'safari') {
        // Note: Safari fails to register shortcuts when using `sendKeys` directly
        // so we need to manually manage the key presses instead.
        await inTracked.click();
        await inTracked.sendKeys('');
        await driver.actions().keyDown(modifierKey).sendKeys('v').keyUp(modifierKey).perform();
      } else {
        // Regular Ctrl+V paste for other browsers
        await inTracked.click();
        await inTracked.sendKeys('');
        await inTracked.sendKeys(Key.chord(modifierKey, 'v'));
      }
    }

    pastedValue = await inTracked.getAttribute('value');

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
          'eventData.properties.fieldName': 'card',
        },
      },
    });

    expect(pasteEvent).to.exist;
    expect(pasteEvent.bodyJSON.events).to.have.length(1);
    expect(pasteEvent.bodyJSON.events[0]).to.containSubset({
      eventType: 'paste',
      eventData: {
        properties: {
          fieldName: 'card',
          formName: 'cardForm',
          formAction: '/form-action',
          panCleaned: true,
          pastedValue: '0000 0000 0000 0000',
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

  it('sends resize events', async () => {
    const platform = getCurrentPlatform();
    const window = driver.manage().window();

    // Resize the window smaller
    const r1 = await window.getRect();

    try {
      await window.setRect({ width: r1.width - 10, height: r1.height - 10 });
    } catch {
      // Handle unsupported platforms after checking the size again
    }

    const r2 = await window.getRect();

    // If no resize occurred
    if (r1.width === r2.width && r1.height === r2.height) {
      // Resize events are not supported on mobile devices, skip test
      if (platform.deviceName) {
        console.log(`Resize events are not supported on ${platform.deviceName}, skipping test.`);
        return;
      } else {
        throw new Error('Resize event did not change window size.');
      }
    }

    // Wait for the resize event to be processed
    await driver.sleep(100);

    // Validate that we got an event in the expected format
    const resizeEvent = await fetchRequestLog(driver, {
      path: '/z',
      query: { key },
      'bodyJSON.events': {
        $elemMatch: {
          eventType: 'resize',
        },
      },
    });

    expect(resizeEvent).to.exist;
    expect(resizeEvent.bodyJSON.events).to.have.length(1);
    expect(resizeEvent.bodyJSON.events[0]).to.containSubset({
      eventType: 'resize',
      eventData: {
        eventName: 'resize',
        properties: {
          resolutionOld: { w: r1.width, h: r1.height },
          resolutionNew: { w: r2.width, h: r2.height },
        },
      },
      eventMeta: {
        trackingSource: 'browser',
        pageTitle: 'track test',
        ravelinDeviceId: deviceId,
        ravelinSessionId: sessionId,
        // url: {"$regex": "^https?://.+/track/.*"},
        // clientEventTimeMilliseconds: {"$gt": 1601315328222},
        // ravelinWindowId: {"$regex": "^[0-9a-z-]{36}$"}
      },
    });
  });
});

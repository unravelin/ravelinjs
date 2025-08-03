import bstackPkg from 'browserstack-node-sdk';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import { Builder, By, Capabilities } from 'selenium-webdriver';

/** @typedef {async (driver) => void} NavTest */

const { BrowserStackSdk } = bstackPkg;

// Add the Chai subset plugin for partial object matching.
// Once we remove support for IE11, we can remove this and upgrade Chai.
// https://github.com/chaijs/chai/pull/1664
chai.use(chaiSubset);

/**
 * buildDriver creates a new Selenium WebDriver instance.
 *
 * @returns {import('selenium-webdriver').WebDriver} A new WebDriver instance.
 */
export function buildDriver() {
  // http://localhost:4444/wd/hub connects to the Selenium server running on BrowserStack,
  // which acts as a proxy between our code and the browser-specific drivers.
  return new Builder()
    .usingServer('http://localhost:4444/wd/hub')
    .withCapabilities(getCapabilities())
    .build();
}

/**
 * @returns {import('selenium-webdriver').Capabilities}
 */
function getCapabilities() {
  const platform = getCurrentPlatform();

  switch (platform.browserName.toLowerCase()) {
    case 'chrome':
    case 'samsung':
      return Capabilities.chrome();
    case 'ie':
      const ie = Capabilities.ie();
      // Potential fix for IE11 not sending modifier keys correctly
      ie.set('nativeEvents', false);
      return ie;
    case 'edge':
      return Capabilities.edge();
    case 'firefox':
      return Capabilities.firefox();
    default:
      throw new Error(`Unsupported browser: ${platform.browserName}`);
  }
}

/** @typedef {object} Platform
 * @property {string} platform.os The OS name
 * @property {string} platform.osVersion The OS version
 * @property {string} platform.browserName The browser name
 * @property {string} platform.browserVersion The browser version
 * @property {string} platform.deviceName The device name (if applicable)
 */

/**
 * @returns {Platform} The current platform information
 */
export function getCurrentPlatform() {
  return BrowserStackSdk.getCurrentPlatform();
}

/**
 * @returns {string} URL string from function params.
 */
export function buildUrl({ baseUrl, path, queryParams }) {
  // Default to the BrowserStack local URL which will
  // tunnel requests to our local server.
  const url = new URL(path, baseUrl || 'http://bs-local.com:3000');

  Object.keys(queryParams).forEach((key) => {
    if (queryParams[key] !== undefined) {
      url.searchParams.append(key, queryParams[key]);
    }
  });

  // Ensure the path ends with a slash as we serve index.html from the folder name.
  url.pathname = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';

  return url.toString();
}

/**
 * navigate attempts to load a page into the browser from a URL.
 * Each test is attempted in sequence a few times until it completes.
 * If the URL fails to load or a test fails then we call refresh() to try
 * again. This process is repeated up to two times by default.
 *
 * @param {WebDriver} driver
 * @param {number} [page.attempts=3]
 * @param {string} page.url
 * @param {NavTest[]} page.tests
 */
export async function navigate(driver, { attempts, url, tests }) {
  const sessionId = (await driver.getSession()).getId();
  let errs = [];

  for (let i = 0; i < (attempts || 3); i++) {
    await driver.get(url);

    try {
      for (const test of tests) {
        await driver.wait(async () => (await test(driver), 5000));
      }
      return;
    } catch (e) {
      console.warn(`Session ${sessionId} failed to load ${url}: ${e}`);
      errs.push(e);
    }

    // If none of the pages we tried worked, perhaps we've got a network issue?
    // Try getting a fresh session to kick things off.
    console.warn(
      `Session ${sessionId} failed to pass tests for ${url} on attempt ${i + 1}. Reloading.`
    );
    await driver.navigate().refresh();
  }
  throw new Error(`Failed to load page: ${errs.join('; ')}`);
}

/**
 * hasTitle checks if the browser's title contains the specified substring.
 *
 * @param {string} substr The substring to be found in the page title.
 * @returns {NavTest}
 */
export function hasTitle(substr) {
  return async function hasTitleTest(driver) {
    const title = await driver.getTitle();
    expect(title).to.contain(
      substr,
      `Expected page title to contain ${substr} but found: ${title}`
    );
  };
}

/**
 * hasURL checks if the browser's URL contains the specified substring.
 *
 * @param {string} substr The substring to be found in the page url.
 * @returns {NavTest}
 */
export function hasURL(substr) {
  return async function hasURLTest(driver) {
    const url = await driver.getCurrentUrl();
    expect(url).to.contain(substr, `Expected page URL to contain ${substr} but found: ${url}`);
  };
}

/**
 * hasElement checks if the browser has an element matching the given ID.
 *
 * @param {string} id The ID of the element to be found.
 * @returns {NavTest}
 */
export function hasElement(id) {
  return async function hasElementTest(driver) {
    const elements = await driver.findElements(By.id(id));
    expect(elements.length).to.equal(
      1,
      `Expected to find one element with ID #${id}, but found ${elements.length}`
    );
  };
}

/**
 * fetchRequestLog queries the localhost server to see whether any /z or /z/err
 * requests were made matching the given pattern. If no pattern is
 * provided, all requests are returned.
 *
 * It is an error for the pattern to anything other than one request.
 *
 * @param {object} pattern A mingo query object https://github.com/kofrasa/mingo.
 * @returns {Promise<object>} A promise that resolves to the first matching request log.
 */
export async function fetchRequestLog(pattern) {
  const q = JSON.stringify(pattern);
  const url = buildUrl({
    // Use localhost instead of bs-local.com as we are calling
    // from the same machine running the server.
    baseUrl: 'http://localhost:3000',
    path: '/requests',
    queryParams: { q },
  });

  // const res = await fetch(url);
  // if (res.status == 204) {
  //   throw new Error(`No requests found matching ${q}`);
  // } else if (!res.ok) {
  //   throw new Error('Error fetching ' + url + ': ' + res.statusText);
  // }
  // const logs = await res.json();
  // if (!logs.length) {
  //   throw new Error(`No requests found matching ${q}`);
  // }
  // return logs[0];

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error fetching ${url}: ${res.statusText}`);
  }
  if (res.status === 204) {
    return undefined;
  }
  const logs = await res.json();
  if (!logs.length) {
    return undefined;
  }
  return logs[0];
}

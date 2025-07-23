import { expect } from 'chai';
import { By, Builder, Capabilities } from 'selenium-webdriver';
import bstackPkg from 'browserstack-node-sdk';

/** @typedef {async (driver) => void} NavTest */

const { BrowserStackSdk } = bstackPkg;

export function buildDriver() {
  return new Builder()
    .usingServer('http://localhost:4444/wd/hub')
    .withCapabilities(getCapabilities())
    .build();
}

function getCapabilities() {
  const platform = BrowserStackSdk.getCurrentPlatform();

  switch (platform.browserName.toLowerCase()) {
    case 'chrome':
    case 'samsung':
      return Capabilities.chrome();
    case 'ie':
      return Capabilities.ie();
    case 'edge':
      return Capabilities.edge();
    case 'firefox':
      return Capabilities.firefox();
    default:
      throw new Error(`Unsupported browser: ${platform.browserName}`);
  }
}

export function buildUrl({ path, queryParams }) {
  const url = new URL(path, 'http://bs-local.com:3000');

  Object.keys(queryParams).forEach((key) => {
    if (queryParams[key] !== undefined) {
      url.searchParams.append(key, queryParams[key]);
    }
  });

  return url.toString();
}

/**
 * navigate attempts to load a page into the browser from a URL.
 * Each test is attempted in sequence a few times until it completes.
 * If the URL fails to load or a test fails then we call refresh() to try
 * again. This process is repeated up to two times by default.
 *
 * @param {WebDriver} driver
 * @param {number} [page.attempts=2]
 * @param {string} page.url
 * @param {NavTest[]} page.tests
 */
export async function navigate(driver, { attempts, url, tests }) {
  const sessionId = (await driver.getSession()).getId();
  let errs = [];

  for (let i = 0; i < (attempts || 2); i++) {
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
 * @param {string} selector
 * @returns {NavTest}
 */
export function hasElement(selector) {
  return async function hasElementTest(driver) {
    const elements = await driver.findElements(By.id(selector));
    expect(elements.length).to.equal(
      1,
      `Expected to find one element with ID #${selector}, but found ${elements.length}`
    );
  };
}

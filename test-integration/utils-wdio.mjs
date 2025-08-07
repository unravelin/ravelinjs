import { browser } from '@wdio/globals';
import { expect } from 'chai';

/** @typedef {async (driver) => boolean} NavTest */

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
 * @param {object} options
 * @param {number} [options.attempts=3] The number of attempts to load the page.
 * @param {string} options.url The URL to navigate to.
 * @param {NavTest[]} options.tests The tests to run after loading the page.
 */
export async function navigate({ attempts, url, tests }) {
  const sessionId = browser.sessionId;
  let errs = [];

  for (let i = 0; i < (attempts || 3); i++) {
    await browser.url(url);

    try {
      for (const test of tests) {
        await browser.waitUntil(
          async () => {
            const result = await test();
            if (typeof result === 'boolean') {
              return result;
            }
            return true; // Test passed
          },
          {
            timeout: 3000, // Wait up to 3s for each test
            interval: 1000, // Check every second
            timeoutMsg: `Presence test failed for session ${sessionId}`,
          }
        );
      }
      return;
    } catch (e) {
      console.warn(`Session ${sessionId} failed navigate test: ${e}`);
      errs.push(e);
    }

    // If none of the pages we tried worked, perhaps we've got a network issue?
    // Try getting a fresh session to kick things off.
    console.warn(
      `Session ${sessionId} failed navigate tests for ${url} on attempt ${i + 1}. Reloading.`
    );
    await browser.reloadSession();
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
  return async function hasTitleTest() {
    const title = await browser.getTitle();
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
  return async function hasURLTest() {
    const url = await browser.getUrl();
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
  return async function hasElementTest() {
    try {
      const e = await browser.$(`#${id}`);
      return await e.isExisting();
    } catch (err) {
      return false;
    }
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
  let requestLog;
  await browser.waitUntil(
    async () => {
      requestLog = await getRequestLog(pattern);
      return !!requestLog;
    },
    {
      timeout: 4000, // Wait up to 4s
      interval: 800, // Check every 800ms
    }
  );

  return requestLog;
}

/**
 * Wrapper for fetching request logs from the server.
 *
 * @param {object} pattern A mingo query object https://github.com/kofrasa/mingo.
 * @returns {Promise<object>} A promise that resolves to the first matching request log.
 */
async function getRequestLog(pattern) {
  const q = JSON.stringify(pattern);
  const url = buildUrl({
    // Use localhost instead of bs-local.com as we are calling
    // from the same machine running the server.
    baseUrl: 'http://localhost:3000',
    path: '/requests',
    queryParams: { q },
  });

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

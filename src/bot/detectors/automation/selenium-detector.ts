/**
 * @fileoverview Detects Selenium / WebDriver / ChromeDriver fingerprints.
 */

/**
 * Heuristics for Selenium-driven browsers: W3C `navigator.webdriver`, legacy injected
 * globals, ChromeDriver property prefixes, and characteristic user-agent substrings.
 * Legitimate WebDriver sessions (including your own E2E) may set these; treat as hints.
 */
export default function createSeleniumDetector(env: detection.Environment): detection.Detector {
  const id = 'selenium';
  const name = 'Selenium';
  const category = 'automation';
  const description = 'Detects Selenium WebDriver and ChromeDriver artifacts';

  /** Names historically injected on `window` / `document` by Selenium WebDriver. */
  const SELENIUM_INJECTED_KEYS = [
    '__webdriver_evaluate',
    '__selenium_evaluate',
    '__fxdriver_evaluate',
    '__driver_evaluate',
    '__webdriver_script_function',
    '__webdriver_script_func',
    '__$webdriverAsyncExecutor',
    '__fxdriver_unwrapped',
    '__webdriver_unwrapped',
    '__driver_unwrapped',
    '__selenium_unwrapped',
    '_Selenium_IDE_Recorder',
  ] as const;

  async function detect(): Promise<detection.DetectionResult> {
    const indicators: string[] = [];

    if (env.navigator?.webdriver) {
      indicators.push('navigator-webdriver');
    }

    const doc = env.document;
    if (doc?.documentElement?.hasAttribute?.('webdriver')) {
      indicators.push('document-element-webdriver-attr');
    }

    if (doc && typeof doc === 'object') {
      for (const key of SELENIUM_INJECTED_KEYS) {
        if (key in doc) {
          indicators.push(`document-${key}`);
        }
      }
    }

    for (const key of SELENIUM_INJECTED_KEYS) {
      if (key in env) {
        indicators.push(`global-${key}`);
      }
    }

    // ChromeDriver historically leaves randomized `$cdc_*` / `cdc_*` properties on `window`.
    for (const key of Object.getOwnPropertyNames(env)) {
      if (
        key.startsWith('$cdc_') ||
        key.startsWith('$chrome_asyncScriptInfo') ||
        /^cdc_/i.test(key)
      ) {
        indicators.push('chromedriver-injected-global');
        break;
      }
    }

    const userAgent = env.navigator?.userAgent || '';
    if (/ChromeDriver|selenium|WebDriverWrapper/i.test(userAgent)) {
      indicators.push('selenium-chrome-driver-user-agent');
    }

    const triggered = indicators.length > 0;

    return Promise.resolve({
      indicators,
      triggered,
    });
  }

  return {
    id,
    name,
    category,
    description,
    detect,
  };
}

/**
 * @fileoverview Detects Selenium / WebDriver / ChromeDriver fingerprints.
 */

/**
 * Heuristics for Selenium-driven browsers: legacy injected globals and characteristic
 * user-agent substrings. Chromium-wide signals live in `chromium-automation.ts`.
 */
export default function createSeleniumDetector(env: detection.Environment): detection.Detector {
  const id = 'selenium';
  const name = 'Selenium';
  const category = 'chromium-automation';
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

    const doc = env.document;
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

    const userAgent = env.navigator?.userAgent || '';
    if (/ChromeDriver|selenium|WebDriverWrapper/i.test(userAgent)) {
      indicators.push('selenium-chrome-driver-user-agent');
    }

    return Promise.resolve({
      id,
      indicators,
      triggered: indicators.length > 0,
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

/**
 * @fileoverview Detects Selenium / WebDriver / ChromeDriver fingerprints.
 */

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

/**
 * Heuristics for Selenium-driven browsers: legacy injected globals and characteristic
 * user-agent substrings. Chromium-wide signals live in `headless-chrome-detector.ts`.
 */
export default class SeleniumDetector implements detection.Detector {
  // Bot detector metadata
  public readonly type = 'selenium';
  public readonly precedence = 10;

  // Detection results
  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    const doc = this.env.document;
    if (doc && typeof doc === 'object') {
      for (const key of SELENIUM_INJECTED_KEYS) {
        if (key in doc) {
          this.indicators.push(`document-${key}`);
        }
      }
    }

    for (const key of SELENIUM_INJECTED_KEYS) {
      if (key in this.env) {
        this.indicators.push(`global-${key}`);
      }
    }

    const userAgent = this.env.navigator?.userAgent || '';
    if (/ChromeDriver|selenium|WebDriverWrapper/i.test(userAgent)) {
      this.indicators.push('selenium-chrome-driver-user-agent');
    }

    this.triggered = this.indicators.length > 0;

    return {
      type: this.type,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }
}

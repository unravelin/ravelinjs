/**
 * @fileoverview Detects Selenium/WebDriver artifacts, such as the globals its
 * language bindings inject into the page, the properties it leaks onto the
 * document, the randomly-named ChromeDriver keys it adds, and user-agent markers
 * left by some configurations.
 */

// NOTE: The following lists are kept separate in case we add a confidence score
// in the future.

/**
 * Globals that Selenium and its WebDriver bindings expose on the page's
 * `window`/`globalThis`. These are strong, direct evidence of a Selenium-driven
 * runtime.
 */
const SELENIUM_GLOBALS = [
  '_selenium',
  '_Selenium_IDE_Recorder',
  '_WEBDRIVER_ELEM_CACHE',
  '__selenium_unwrapped',
  '__selenium_evaluate',
  '__webdriver_evaluate',
  '__webdriver_unwrapped',
  '__webdriver_script_fn',
  '__webdriver_script_func',
  '__webdriver_script_function',
  '__driver_evaluate',
  '__driver_unwrapped',
  '__fxdriver_evaluate',
  '__fxdriver_unwrapped',
  '__$webdriverAsyncExecutor',
];

/** Properties Selenium leaks onto the document object. */
const SELENIUM_DOCUMENT_ARTIFACTS = [
  '__selenium_unwrapped',
  '__selenium_evaluate',
  '__webdriver_evaluate',
  '__webdriver_unwrapped',
  '__webdriver_script_fn',
  '__webdriver_script_func',
  '__webdriver_script_function',
  '__driver_evaluate',
  '__driver_unwrapped',
  '__fxdriver_evaluate',
  '__fxdriver_unwrapped',
  'selenium-evaluate',
  'webdriver-evaluate',
];

/**
 * ChromeDriver injects randomly-named properties (e.g.
 * `$cdc_asdjflasutopfhvcZLmcfl_Array`) onto `window` and `document` that share a
 * recognisable prefix.
 */
const CHROMEDRIVER_KEY_PATTERN = /^\$?(?:cdc|wdc)_/;

/**
 * Detects browser automation driven by Selenium/WebDriver.
 */
export default class SeleniumDetector implements detection.Detector {
  public readonly signal = 'selenium';
  public readonly precedence = 50;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    this._detectGlobals();
    this._detectDocumentArtifacts();
    this._detectChromeDriverArtifacts();
    this._detectUserAgent();

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }

  /** Direct Selenium/WebDriver globals injected into the page. */
  private _detectGlobals(): void {
    for (const global of SELENIUM_GLOBALS) {
      if (global in this.env) {
        this.indicators.push(`global-${global}`);
      }
    }
  }

  /** Properties Selenium leaks onto the document object. */
  private _detectDocumentArtifacts(): void {
    const doc = this.env.document;
    if (!doc) {
      return;
    }

    for (const artifact of SELENIUM_DOCUMENT_ARTIFACTS) {
      if (artifact in doc) {
        this.indicators.push(`document-${artifact}`);
      }
    }
  }

  /** Randomly-named ChromeDriver keys left on `window` and `document`. */
  private _detectChromeDriverArtifacts(): void {
    for (const target of [this.env, this.env.document]) {
      if (!target) {
        continue;
      }

      let keys: string[];
      try {
        keys = Object.getOwnPropertyNames(target);
      } catch {
        continue;
      }

      for (const key of keys) {
        const indicator = `chromedriver-${key}`;
        if (CHROMEDRIVER_KEY_PATTERN.test(key) && !this.indicators.includes(indicator)) {
          this.indicators.push(`chromedriver-${key}`);
        }
      }
    }
  }

  /** User-agent substring left by some Selenium configurations. */
  private _detectUserAgent(): void {
    const userAgent = this.env.navigator?.userAgent ?? '';
    if (/selenium/i.test(userAgent)) {
      this.indicators.push('selenium-user-agent');
    }
  }
}

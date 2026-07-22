/**
 * @fileoverview Detects ChromeDriver-specific artifacts, such as the fixed
 * globals it injects and the randomly-named `$cdc_…` keys it adds to `window`
 * and `document`. ChromeDriver is the WebDriver server behind Selenium's Chrome
 * sessions, so these are strong, direct evidence of a ChromeDriver-driven
 * runtime.
 */

// NOTE: The following lists are kept separate in case we add a confidence score
// in the future.

/** Fixed-name globals ChromeDriver injects onto `window`/`document`. */
const CHROMEDRIVER_GLOBALS = ['$chrome_asyncScriptInfo'];

/**
 * ChromeDriver injects randomly-named properties (e.g.
 * `$cdc_asdjflasutopfhvcZLmcfl_Array`) onto `window` and `document` that share a
 * recognisable prefix.
 */
const CHROMEDRIVER_KEY_PATTERN = /^\$?(?:cdc|wdc)_/;

/**
 * Detects browser automation driven by ChromeDriver.
 */
export default class ChromeDriverDetector implements detection.Detector {
  public readonly signal = 'chromedriver';
  public readonly precedence = 25;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    this._detectGlobals();
    this._detectInjectedKeys();

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }

  /** Fixed-name ChromeDriver globals on `window` and `document`. */
  private _detectGlobals(): void {
    for (const target of [this.env, this.env.document]) {
      if (!target) {
        continue;
      }

      for (const global of CHROMEDRIVER_GLOBALS) {
        const indicator = `global-${global}`;
        if (global in target && !this.indicators.includes(indicator)) {
          this.indicators.push(indicator);
        }
      }
    }
  }

  /** Randomly-named ChromeDriver keys left on `window` and `document`. */
  private _detectInjectedKeys(): void {
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
        const indicator = `injected-key-${key}`;
        if (CHROMEDRIVER_KEY_PATTERN.test(key) && !this.indicators.includes(indicator)) {
          this.indicators.push(indicator);
        }
      }
    }
  }
}

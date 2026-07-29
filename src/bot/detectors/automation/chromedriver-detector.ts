/**
 * @fileoverview Detects ChromeDriver-specific artifacts, such as the fixed
 * globals it injects and the randomly-named `$cdc_…` keys it adds to `window`
 * and `document`. ChromeDriver is the WebDriver server behind Selenium's Chrome
 * sessions, so these are strong, direct evidence of a ChromeDriver-driven
 * runtime.
 */

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
  public indicators: detection.Indicator[] = [];

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
      if (target) {
        for (const global of CHROMEDRIVER_GLOBALS) {
          const id = `global-${global}`;
          if (global in target && !this._has(id)) {
            // A fixed ChromeDriver global is a direct automation artifact.
            this.indicators.push({ id, confidence: 100 });
          }
        }
      }
    }
  }

  /** Randomly-named ChromeDriver keys left on `window` and `document`. */
  private _detectInjectedKeys(): void {
    for (const target of [this.env, this.env.document]) {
      if (target) {
        let keys: string[];
        try {
          keys = Object.getOwnPropertyNames(target);
        } catch {
          continue;
        }

        for (const key of keys) {
          const id = `injected-key-${key}`;
          if (CHROMEDRIVER_KEY_PATTERN.test(key) && !this._has(id)) {
            // A `$cdc_`/`wdc_` key is a recognisable ChromeDriver signature.
            this.indicators.push({ id, confidence: 100 });
          }
        }
      }
    }
  }

  /** Whether an indicator with the given id has already been recorded. */
  private _has(id: string): boolean {
    return this.indicators.some(indicator => indicator.id === id);
  }
}

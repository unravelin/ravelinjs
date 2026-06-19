/**
 * @fileoverview Browser-agnostic automation signals (WebDriver, headless-like
 * environments). These apply across Chromium, Firefox, Safari WebDriver, etc.
 */

/**
 * Detects generic browser automation fingerprints not tied to a specific engine.
 */
export default class BrowserAutomationDetector implements detection.Detector {
  public readonly type = 'browser-automation';
  public readonly precedence = 100;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    const nav = this.env.navigator;

    if (nav?.webdriver) {
      this.indicators.push('navigator-webdriver');
    }

    const doc = this.env.document;
    if (doc?.documentElement?.hasAttribute?.('webdriver')) {
      this.indicators.push('document-element-webdriver-attr');
    }

    if (nav?.languages?.length === 0) {
      this.indicators.push('empty-navigator-languages');
    }

    if (this.env.outerWidth === 0 && this.env.outerHeight === 0) {
      this.indicators.push('zero-outer-dimensions');
    }

    const appVersion = nav?.appVersion || '';
    if (/headless/i.test(appVersion)) {
      this.indicators.push('headless-app-version');
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

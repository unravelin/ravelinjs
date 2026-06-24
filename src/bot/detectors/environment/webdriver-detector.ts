/**
 * @fileoverview Browser-agnostic automation signals (WebDriver, headless-like
 * environments). These apply across Chromium, Firefox, Safari WebDriver, etc.
 */

/**
 * Detects generic browser automation fingerprints not tied to a specific engine.
 */
export default class WebdriverDetector implements detection.Detector {
  public readonly signal = 'webdriver';
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

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }
}

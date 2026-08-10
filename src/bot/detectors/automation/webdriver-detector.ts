/**
 * @fileoverview WebDriver protocol and driver-leak signals, such as
 * `navigator.webdriver` and legacy WebDriver attributes on the document.
 */

/**
 * Detects browser automation via the WebDriver standard and related driver artifacts.
 */
export default class WebDriverDetector implements detection.Detector {
  public readonly signal = 'webdriver';
  public readonly precedence = 10;

  public triggered = false;
  public indicators: detection.Indicator[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    const nav = this.env.navigator || ({} as Navigator);

    // The standard automation flag; no human browser sets it.
    if (nav.webdriver) {
      this.indicators.push({ id: 'navigator-webdriver', confidence: 95 });
    }

    const doc = this.env.document;
    if (doc?.documentElement?.hasAttribute?.('webdriver')) {
      this.indicators.push({ id: 'document-element-webdriver-attr', confidence: 95 });
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

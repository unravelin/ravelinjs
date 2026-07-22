/**
 * @fileoverview WebDriver protocol and driver-leak signals, such as
 * `navigator.webdriver` and legacy WebDriver attributes on the document.
 */

import { PRECEDENCE } from '../precedence.ts';

/**
 * Detects browser automation via the WebDriver standard and related driver artifacts.
 */
export default class WebDriverDetector implements detection.Detector {
  public readonly signal = 'webdriver';
  public readonly precedence = PRECEDENCE.GENERIC;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    const nav = this.env.navigator || ({} as Navigator);

    if (nav.webdriver) {
      this.indicators.push('navigator-webdriver');
    }

    const doc = this.env.document;
    if (doc?.documentElement?.hasAttribute?.('webdriver')) {
      this.indicators.push('document-element-webdriver-attr');
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

/**
 * @fileoverview Heuristics for headless and headless-like browser environments,
 * such as zero window dimensions, HeadlessChrome user agents, and empty plugins
 * or languages.
 */

/**
 * Detects environment fingerprints commonly seen in headless automation.
 */
export default class HeadlessDetector implements detection.Detector {
  public readonly signal = 'headless';
  public readonly precedence = 10;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    const nav = this.env.navigator;

    if (this.env.outerWidth === 0 && this.env.outerHeight === 0) {
      this.indicators.push('zero-outer-dimensions');
    }

    const appVersion = nav?.appVersion || '';
    if (/headless/i.test(appVersion)) {
      this.indicators.push('headless-app-version');
    }

    const userAgent = nav?.userAgent || '';
    if (/HeadlessChrome/i.test(userAgent)) {
      this.indicators.push('headless-chrome-user-agent');
    }

    if (nav?.languages?.length === 0) {
      this.indicators.push('no-languages');
    }

    if (nav.plugins && nav.plugins.length === 0) {
      this.indicators.push('no-plugins');
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

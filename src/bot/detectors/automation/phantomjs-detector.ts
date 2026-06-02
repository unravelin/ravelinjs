/**
 * @fileoverview Detects PhantomJS (legacy headless WebKit) fingerprints.
 */

/**
 * PhantomJS exposed several distinctive globals and a characteristic user agent.
 * Phantom is unmaintained but still useful to detect for legacy traffic or spoofed UAs.
 */
export default class PhantomJSDetector implements detection.Detector {
  // Bot detector metadata
  public readonly type = 'phantomJS';
  public readonly category = 'automation';
  public readonly precedence = 10;

  // Detection results
  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    if (typeof this.env.callPhantom === 'function') {
      this.indicators.push('callPhantom');
    }

    if (this.env._phantom != null) {
      this.indicators.push('_phantom');
    }

    if (this.env.phantom != null) {
      this.indicators.push('phantom-global');
    }

    const userAgent = this.env.navigator?.userAgent || '';
    if (/PhantomJS/i.test(userAgent)) {
      this.indicators.push('phantomjs-user-agent');
    }

    this.triggered = this.indicators.length > 0;

    return {
      type: this.type,
      category: this.category,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }
}

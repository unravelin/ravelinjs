/**
 * @fileoverview Detects Puppeteer-specific artifacts, such as the globals it
 * injects into the page, the `sourceURL` marker it wraps evaluated scripts with,
 * and user-agent markers left by some configurations.
 */

// NOTE: The following globals are separate in case we add a confidence score in
// the future.

/**
 * Globals that Puppeteer exposes on the page's `window`/`globalThis`. These are
 * strong, direct evidence of a Puppeteer-driven runtime.
 */
const PUPPETEER_GLOBALS = ['__puppeteer_evaluation_script__', '__puppeteer__', 'puppeteer'];

/**
 * Marker Puppeteer appends to scripts it evaluates (`//# sourceURL=...`), which
 * leaks into `eval` sources and error stacks.
 */
const PUPPETEER_SOURCE_MARKER = /puppeteer_evaluation_script/i;

/**
 * Detects browser automation driven by Puppeteer.
 */
export default class PuppeteerDetector implements detection.Detector {
  public readonly signal = 'puppeteer';
  public readonly precedence = 100;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    this._detectGlobals();
    this._detectSourceMarker();
    this._detectUserAgent();

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }

  /** Direct Puppeteer runtime globals injected into the page. */
  private _detectGlobals(): void {
    for (const global of PUPPETEER_GLOBALS) {
      if (global in this.env) {
        this.indicators.push(`global-${global}`);
      }
    }
  }

  /** `sourceURL` marker Puppeteer leaves on scripts it evaluates. */
  private _detectSourceMarker(): void {
    try {
      const evalStr = this.env.eval?.toString?.() ?? '';
      if (PUPPETEER_SOURCE_MARKER.test(evalStr)) {
        this.indicators.push('eval-puppeteer-marker');
      }
    } catch {
      // A throwing `toString` is not itself evidence of Puppeteer; ignore it.
    }
  }

  /** User-agent substring left by some Puppeteer configurations. */
  private _detectUserAgent(): void {
    const userAgent = this.env.navigator?.userAgent ?? '';
    if (/Puppeteer/i.test(userAgent)) {
      this.indicators.push('puppeteer-user-agent');
    }
  }
}

/**
 * @fileoverview Detects PhantomJS-specific artifacts. PhantomJS is a legacy
 * QtWebKit-based headless browser (not Chromium, so it does not speak CDP). It
 * exposes distinctive bridge globals on the page and identifies itself in the
 * user agent.
 */

import { PRECEDENCE } from '../precedence';

/**
 * Globals PhantomJS exposes on the page's `window`/`globalThis` for its
 * page-to-runtime bridge. These are strong, direct evidence of PhantomJS.
 */
const PHANTOMJS_GLOBALS = ['callPhantom', '_phantom', 'phantom'];

/**
 * Detects browser automation driven by PhantomJS.
 */
export default class PhantomJSDetector implements detection.Detector {
  public readonly signal = 'phantomjs';
  public readonly precedence = PRECEDENCE.HARD_ARTIFACT;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    this._detectGlobals();
    this._detectUserAgent();

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }

  /** Direct PhantomJS bridge globals injected into the page. */
  private _detectGlobals(): void {
    for (const global of PHANTOMJS_GLOBALS) {
      if (global in this.env) {
        this.indicators.push(`global-${global}`);
      }
    }
  }

  /** User-agent substring left by PhantomJS. */
  private _detectUserAgent(): void {
    const userAgent = this.env.navigator?.userAgent ?? '';
    if (/PhantomJS/i.test(userAgent)) {
      this.indicators.push('phantomjs-user-agent');
    }
  }
}

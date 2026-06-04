/**
 * @fileoverview Detects SlimerJS (Gecko-based PhantomJS-compatible automation) fingerprints.
 */

function collectSlimerPrefixedKeys(target: object): string[] {
  const found: string[] = [];
  try {
    for (const key of Object.getOwnPropertyNames(target)) {
      if (key.startsWith('__slimer')) {
        found.push(key);
      }
    }
  } catch {
    // Ignore
  }
  return found;
}

/**
 * SlimerJS mirrors much of the PhantomJS API (`phantom`, `callPhantom`) but also exposes
 * a `slimer` global and a distinctive default user agent. Phantom-only leaks are handled
 * by `phantomjs-detector.ts`.
 */
export default class SlimerJSDetector implements detection.Detector {
  public readonly type = 'slimerJS';
  public readonly precedence = 10;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    if (this.env.slimer != null) {
      this.indicators.push('slimer-global');
    }

    for (const key of collectSlimerPrefixedKeys(this.env)) {
      this.indicators.push(`global-${key}`);
    }

    const userAgent = this.env.navigator?.userAgent || '';
    if (/SlimerJS/i.test(userAgent)) {
      this.indicators.push('slimerjs-user-agent');
    }

    const appVersion = this.env.navigator?.appVersion || '';
    if (/slimerjs/i.test(appVersion)) {
      this.indicators.push('slimerjs-app-version');
    }

    try {
      const evalStr = this.env.eval?.toString?.() ?? '';
      if (/slimerjs/i.test(evalStr)) {
        this.indicators.push('eval-slimerjs-marker');
      }
    } catch {
      // Ignore
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

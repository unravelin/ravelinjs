/**
 * @fileoverview Detects chromedp (Go CDP client) fingerprints.
 */

function collectChromedpNamedKeys(target: object): string[] {
  const found: string[] = [];
  try {
    for (const key of Object.getOwnPropertyNames(target)) {
      if (/chromedp/i.test(key)) {
        found.push(key);
      }
    }
  } catch {
    // Ignore
  }
  return found;
}

/**
 * chromedp talks to Chrome over CDP only — no ChromeDriver-style `$cdc_*` window
 * patches. Page-visible signals are mostly string artifacts from evaluated scripts,
 * stacks, or custom globals; treat as hints.
 */
export default class ChromedpDetector implements detection.Detector {
  // Bot detector metadata
  public readonly type = 'chromeMDP';
  public readonly precedence = 50;

  // Detection results
  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    for (const key of collectChromedpNamedKeys(this.env)) {
      this.indicators.push(`global-${key}`);
    }

    const doc = this.env.document;
    if (doc && typeof doc === 'object') {
      for (const key of collectChromedpNamedKeys(doc)) {
        this.indicators.push(`document-${key}`);
      }
    }

    try {
      const evalStr = this.env.eval?.toString?.() ?? '';
      if (/chromedp/i.test(evalStr)) {
        this.indicators.push('eval-chromedp-marker');
      }
    } catch {
      // Ignore
    }

    const userAgent = this.env.navigator?.userAgent || '';
    if (/chromedp/i.test(userAgent)) {
      this.indicators.push('chromedp-user-agent');
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

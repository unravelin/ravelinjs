/**
 * @fileoverview Detects Puppeteer-specific artifacts.
 */

/** Legacy globals Puppeteer has injected on `window`. */
const PUPPETEER_GLOBALS = ['__puppeteer_evaluation_script__', '__puppeteer', 'puppeteer'] as const;

function collectPuppeteerPrefixedKeys(target: object): string[] {
  const found: string[] = [];
  try {
    for (const key of Object.getOwnPropertyNames(target)) {
      if (key.startsWith('__puppeteer')) {
        found.push(key);
      }
    }
  } catch {
    // Ignore
  }
  return found;
}

/**
 * Detects artifacts left by Puppeteer automation.
 * Chromium-wide heuristics live in `headless-chrome-detector.ts`.
 */
export default class PuppeteerDetector implements detection.Detector {
  // Bot detector metadata
  public readonly type = 'puppeteer';
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
    if (this.env.__puppeteer_evaluation_script__) {
      this.indicators.push('puppeteer-evaluation-script');
    }

    for (const global of PUPPETEER_GLOBALS) {
      if (global in this.env) {
        this.indicators.push(`global-${global}`);
      }
    }

    for (const key of collectPuppeteerPrefixedKeys(this.env)) {
      if (!PUPPETEER_GLOBALS.includes(key as (typeof PUPPETEER_GLOBALS)[number])) {
        this.indicators.push(`global-${key}`);
      }
    }

    try {
      const evalStr = this.env.eval?.toString?.() ?? '';
      if (evalStr.includes('puppeteer')) {
        this.indicators.push('eval-puppeteer');
      }
    } catch {
      // Ignore
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

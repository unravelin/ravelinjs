/**
 * @fileoverview Detects Playwright-specific artifacts.
 */

/**
 * Detects bindings and init-script globals Playwright injects into the page, plus
 * loose eval/stack markers when automation code runs in-page. Heuristic only.
 */
export default class PlaywrightDetector implements detection.Detector {
  // Bot detector metadata
  public readonly type = 'playwright';
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
    const playwrightGlobals = ['__playwright__binding__', '__pwInitScripts'];

    for (const global of playwrightGlobals) {
      if (global in this.env) {
        this.indicators.push(`global-${global}`);
      }
    }

    for (const key of Object.getOwnPropertyNames(this.env)) {
      if (key.startsWith('__playwright') || key.startsWith('__pw')) {
        if (!playwrightGlobals.includes(key)) {
          this.indicators.push(`global-${key}`);
        }
      }
    }

    try {
      const evalStr = this.env.eval?.toString?.() ?? '';
      if (/playwright/i.test(evalStr)) {
        this.indicators.push('eval-playwright-marker');
      }
    } catch {
      // Ignore
    }

    try {
      throw new Error('stack trace test');
    } catch (e) {
      const stack = e instanceof Error ? e.stack || '' : '';
      if (
        stack.includes('@playwright') ||
        /[/\\]playwright[/\\]/.test(stack) ||
        stack.includes('playwright/lib')
      ) {
        this.indicators.push('stack-trace-playwright');
      }
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

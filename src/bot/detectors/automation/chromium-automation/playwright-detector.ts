/**
 * @fileoverview Detects Playwright-specific artifacts.
 */

/**
 * Detects bindings and init-script globals Playwright injects into the page, plus
 * loose eval/stack markers when automation code runs in-page. Heuristic only.
 */
export default function createPlaywrightDetector(env: detection.Environment): detection.Detector {
  const id = 'playwright';
  const name = 'Playwright';
  const category = 'chromium-automation';
  const description = 'Detects Playwright automation artifacts';

  async function detect(): Promise<detection.DetectionResult> {
    const indicators: string[] = [];

    // Known injected names (see Playwright in-page binding / init script hooks).
    const playwrightGlobals = ['__playwright__binding__', '__pwInitScripts'];

    for (const global of playwrightGlobals) {
      if (global in env) {
        indicators.push(`global-${global}`);
      }
    }

    // Other Playwright-prefixed globals (e.g. internal bindings, init hooks).
    for (const key of Object.getOwnPropertyNames(env)) {
      if (key.startsWith('__playwright') || key.startsWith('__pw')) {
        if (!playwrightGlobals.includes(key)) {
          indicators.push(`global-${key}`);
        }
      }
    }

    try {
      const evalStr = env.eval?.toString?.() ?? '';
      if (/playwright/i.test(evalStr)) {
        indicators.push('eval-playwright-marker');
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
        indicators.push('stack-trace-playwright');
      }
    }

    return Promise.resolve({
      id,
      indicators,
      triggered: indicators.length > 0,
    });
  }

  return {
    id,
    name,
    category,
    description,
    detect,
  };
}

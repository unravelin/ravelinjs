/**
 * @fileoverview Detects Puppeteer-specific artifacts.
 */

/**
 * Detects artifacts left by Puppeteer automation.
 * Puppeteer leaves various fingerprints in the browser context.
 */
export default function createPuppeteerDetector(env: detection.Environment): detection.Detector {
  const id = 'puppeteer';
  const name = 'Puppeteer';
  const category = 'automation';
  const description = 'Detects Puppeteer automation artifacts';

  async function detect(): Promise<detection.DetectionResult> {
    const indicators: string[] = [];

    // Check for Puppeteer evaluation script marker
    if (env.__puppeteer_evaluation_script__) {
      indicators.push('puppeteer-evaluation-script');
    }

    // Check for Puppeteer-injected functions
    const puppeteerGlobals = ['__puppeteer_evaluation_script__', '__puppeteer', 'puppeteer'];

    for (const global of puppeteerGlobals) {
      if (global in env) {
        indicators.push(`global-${global}`);
      }
    }

    // Check for HeadlessChrome in user agent (common with Puppeteer)
    const userAgent = env.navigator?.userAgent || '';
    if (userAgent.includes('HeadlessChrome')) {
      indicators.push('headless-chrome-user-agent');
    }

    // Check for Puppeteer's typical Chrome DevTools Protocol artifacts
    if (
      window.cdc_adoQpoasnfa76pfcZLmcfl_Array ||
      window.cdc_adoQpoasnfa76pfcZLmcfl_Promise ||
      window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol
    ) {
      indicators.push('cdp-artifacts');
    }

    // Check for DevTools protocol detection
    try {
      // Puppeteer often leaves eval traces
      const evalTest = window.eval.toString();
      if (evalTest.includes('puppeteer')) {
        indicators.push('eval-puppeteer');
      }
    } catch (e) {
      // Ignore errors
    }

    // Check for typical Puppeteer page.evaluate patterns in stack traces
    try {
      throw new Error('stack trace test');
    } catch (e) {
      const stack = e.stack || '';
      if (stack.includes('puppeteer') || stack.includes('pptr')) {
        indicators.push('stack-trace-puppeteer');
      }
    }

    return Promise.resolve({
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

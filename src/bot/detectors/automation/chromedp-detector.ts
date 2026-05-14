/**
 * @fileoverview Detects chromedp (Go CDP client) fingerprints.
 */

/**
 * chromedp talks to Chrome over CDP only — no ChromeDriver-style `$cdc_*` window
 * patches. Page-visible signals are mostly string artifacts from evaluated scripts,
 * stacks, or custom globals; treat as hints.
 */
export default function createChromedpDetector(env: detection.Environment): detection.Detector {
  const id = 'chromedp';
  const name = 'chromedp';
  const category = 'automation';
  const description = 'Detects chromedp (Go Chrome DevTools Protocol) artifacts';

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

  async function detect(): Promise<detection.DetectionResult> {
    const indicators: string[] = [];

    for (const key of collectChromedpNamedKeys(env)) {
      indicators.push(`global-${key}`);
    }

    const doc = env.document;
    if (doc && typeof doc === 'object') {
      for (const key of collectChromedpNamedKeys(doc)) {
        indicators.push(`document-${key}`);
      }
    }

    try {
      const evalStr = env.eval?.toString?.() ?? '';
      if (/chromedp/i.test(evalStr)) {
        indicators.push('eval-chromedp-marker');
      }
    } catch {
      // Ignore
    }

    try {
      throw new Error('stack trace test');
    } catch (e) {
      const stack = e instanceof Error ? e.stack || '' : '';
      if (
        stack.includes('chromedp') ||
        stack.includes('github.com/chromedp/chromedp') ||
        /[/\\]chromedp[/\\]/.test(stack)
      ) {
        indicators.push('stack-trace-chromedp');
      }
    }

    const ua = env.navigator?.userAgent || '';
    if (/chromedp/i.test(ua)) {
      indicators.push('user-agent-chromedp-marker');
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

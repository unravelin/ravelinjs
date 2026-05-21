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
 * Chromium-wide heuristics live in `chromium-automation.ts`.
 */
export default function createPuppeteerDetector(env: detection.Environment): detection.Detector {
  const id = 'puppeteer';
  const name = 'Puppeteer';
  const category = 'chromium-automation';
  const description = 'Detects Puppeteer automation artifacts';

  async function detect(): Promise<detection.DetectionResult> {
    const indicators: string[] = [];

    if (env.__puppeteer_evaluation_script__) {
      indicators.push('puppeteer-evaluation-script');
    }

    for (const global of PUPPETEER_GLOBALS) {
      if (global in env) {
        indicators.push(`global-${global}`);
      }
    }

    for (const key of collectPuppeteerPrefixedKeys(env)) {
      if (!PUPPETEER_GLOBALS.includes(key as (typeof PUPPETEER_GLOBALS)[number])) {
        indicators.push(`global-${key}`);
      }
    }

    try {
      const evalStr = env.eval?.toString?.() ?? '';
      if (evalStr.includes('puppeteer')) {
        indicators.push('eval-puppeteer');
      }
    } catch {
      // Ignore
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

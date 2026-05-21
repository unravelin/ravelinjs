/**
 * @fileoverview Heuristics shared by Chromium-based automation (Puppeteer, Playwright,
 * Selenium + ChromeDriver, chromedp). Tool-specific detectors should not repeat these.
 */

function isChromiumChromeUserAgent(userAgent: string): boolean {
  return /Chrome|Chromium/i.test(userAgent) && !/Edg|OPR|SamsungBrowser|Brave/i.test(userAgent);
}

function hasLegacyCdcArtifacts(env: detection.Environment): boolean {
  return Boolean(
    env.cdc_adoQpoasnfa76pfcZLmcfl_Array ||
    env.cdc_adoQpoasnfa76pfcZLmcfl_Promise ||
    env.cdc_adoQpoasnfa76pfcZLmcfl_Symbol
  );
}

function hasChromedriverInjectedGlobal(env: detection.Environment): boolean {
  try {
    for (const key of Object.getOwnPropertyNames(env)) {
      if (
        key.startsWith('$cdc_') ||
        key.startsWith('$chrome_asyncScriptInfo') ||
        /^cdc_/i.test(key)
      ) {
        return true;
      }
    }
  } catch {
    // Ignore
  }
  return false;
}

async function notificationsPermissionDenied(env: detection.Environment): Promise<boolean> {
  const query = env.navigator?.permissions?.query;
  if (!query) {
    return false;
  }
  try {
    const result = await query.call(env.navigator?.permissions, { name: 'notifications' });
    return result.state === 'denied';
  } catch {
    return false;
  }
}

/**
 * Detects browser-level signals common to CDP- and WebDriver-controlled Chromium.
 * Legitimate automation (including your own E2E) may trigger these; treat as hints.
 */
export default function createChromiumAutomationDetector(
  env: detection.Environment
): detection.Detector {
  const id = 'chromium-automation';
  const name = 'Chromium automation';
  const category = 'chromium-automation';
  const description =
    'Detects Chromium automation artifacts shared by Puppeteer, Playwright, and Selenium';

  async function detect(): Promise<detection.DetectionResult> {
    const indicators: string[] = [];
    const nav = env.navigator;
    const userAgent = nav?.userAgent || '';

    if (nav?.webdriver) {
      indicators.push('navigator-webdriver');
    }

    const doc = env.document;
    if (doc?.documentElement?.hasAttribute?.('webdriver')) {
      indicators.push('document-element-webdriver-attr');
    }

    if (hasLegacyCdcArtifacts(env)) {
      indicators.push('cdp-artifacts');
    }

    if (hasChromedriverInjectedGlobal(env)) {
      indicators.push('chromedriver-injected-global');
    }

    if (userAgent.includes('HeadlessChrome')) {
      indicators.push('headless-chrome-user-agent');
    }

    const chrome = env.chrome;
    if (chrome && isChromiumChromeUserAgent(userAgent) && !chrome.runtime) {
      indicators.push('chrome-runtime-missing');
    }

    if (isChromiumChromeUserAgent(userAgent) && nav?.plugins?.length === 0) {
      indicators.push('empty-plugins-chrome');
    }

    if (nav?.languages?.length === 0) {
      indicators.push('empty-navigator-languages');
    }

    if (env.outerWidth === 0 && env.outerHeight === 0) {
      indicators.push('zero-outer-dimensions');
    }

    const brands = nav?.userAgentData?.brands;
    if (brands?.length && isChromiumChromeUserAgent(userAgent)) {
      const hasChromium = brands.some(b => b.brand === 'Chromium');
      const hasGoogleChrome = brands.some(b => b.brand === 'Google Chrome');
      if (hasChromium && !hasGoogleChrome) {
        indicators.push('user-agent-data-missing-google-chrome-brand');
      }
    }

    if (await notificationsPermissionDenied(env)) {
      indicators.push('permissions-notifications-denied');
    }

    return Promise.resolve({
      subType: id,
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

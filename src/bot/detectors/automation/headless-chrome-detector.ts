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
export default class HeadlessChromeDetector implements detection.Detector {
  // Bot detector metadata
  public readonly type = 'headless-chrome';
  public readonly category = 'automation';
  public readonly precedence = 100;

  // Detection results
  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    const nav = this.env.navigator;
    const userAgent = nav?.userAgent || '';

    if (nav?.webdriver) {
      this.indicators.push('navigator-webdriver');
    }

    const doc = this.env.document;
    if (doc?.documentElement?.hasAttribute?.('webdriver')) {
      this.indicators.push('document-element-webdriver-attr');
    }

    if (hasLegacyCdcArtifacts(this.env)) {
      this.indicators.push('cdp-artifacts');
    }

    if (hasChromedriverInjectedGlobal(this.env)) {
      this.indicators.push('chromedriver-injected-global');
    }

    if (userAgent.includes('HeadlessChrome')) {
      this.indicators.push('headless-chrome-user-agent');
    }

    const chrome = this.env.chrome;
    if (chrome && isChromiumChromeUserAgent(userAgent) && !chrome.runtime) {
      this.indicators.push('chrome-runtime-missing');
    }

    if (isChromiumChromeUserAgent(userAgent) && nav?.plugins?.length === 0) {
      this.indicators.push('empty-plugins-chrome');
    }

    if (nav?.languages?.length === 0) {
      this.indicators.push('empty-navigator-languages');
    }

    if (this.env.outerWidth === 0 && this.env.outerHeight === 0) {
      this.indicators.push('zero-outer-dimensions');
    }

    const brands = nav?.userAgentData?.brands;
    if (brands?.length && isChromiumChromeUserAgent(userAgent)) {
      const hasChromium = brands.some(b => b.brand === 'Chromium');
      const hasGoogleChrome = brands.some(b => b.brand === 'Google Chrome');
      if (hasChromium && !hasGoogleChrome) {
        this.indicators.push('user-agent-data-missing-google-chrome-brand');
      }
    }

    if (await notificationsPermissionDenied(this.env)) {
      this.indicators.push('permissions-notifications-denied');
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

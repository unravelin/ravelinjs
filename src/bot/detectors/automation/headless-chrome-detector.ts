/**
 * @fileoverview Heuristics shared by Chromium-based automation (Puppeteer, Playwright,
 * Selenium + ChromeDriver, chromedp). Tool-specific detectors should not repeat these.
 */

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

function checkWebGLContext(env: detection.Environment): boolean {
  const doc = env.document;
  if (!doc || typeof doc.createElement !== 'function') {
    return false;
  }

  try {
    const canvasElement = doc.createElement('canvas');
    if (!canvasElement || typeof canvasElement.getContext !== 'function') {
      return false;
    }

    const webGLContext = canvasElement.getContext('webgl');
    if (webGLContext === null || typeof webGLContext.getParameter !== 'function') {
      return false;
    }

    const vendor = webGLContext.getParameter(webGLContext.VENDOR);
    const renderer = webGLContext.getParameter(webGLContext.RENDERER);

    return vendor == 'Brian Paul' && renderer == 'Mesa OffScreen';
  } catch {
    return false;
  }
}

/**
 * Detects browser-level signals common to CDP- and WebDriver-controlled Chromium.
 * Note that integration and unit tests will trigger these.
 */
export default class HeadlessChromeDetector implements detection.Detector {
  // Bot detector metadata
  public readonly type = 'headless-chrome';
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

    const userAgent = nav?.userAgent || '';
    if (/Headless/i.test(userAgent)) {
      this.indicators.push('headless-chrome-user-agent');
    }

    // User agent checks
    const chrome = this.env.chrome;
    const isChromiumChromeUserAgent =
      /Chrome|Chromium/i.test(userAgent) && !/Edg|OPR|SamsungBrowser|Brave/i.test(userAgent);
    if (chrome && isChromiumChromeUserAgent && !chrome.runtime) {
      this.indicators.push('chrome-runtime-missing');
    }

    if (isChromiumChromeUserAgent && nav?.plugins?.length === 0) {
      this.indicators.push('empty-plugins-chrome');
    }

    const brands = nav?.userAgentData?.brands;
    if (brands?.length && isChromiumChromeUserAgent) {
      const hasChromium = brands.some(b => b.brand === 'Chromium');
      const hasGoogleChrome = brands.some(b => b.brand === 'Google Chrome');
      if (hasChromium && !hasGoogleChrome) {
        this.indicators.push('user-agent-data-missing-google-chrome-brand');
      }
    }

    if (nav?.languages?.length === 0) {
      this.indicators.push('empty-navigator-languages');
    }

    if (this.env.outerWidth === 0 && this.env.outerHeight === 0) {
      this.indicators.push('zero-outer-dimensions');
    }

    const appVersion = this.env.navigator?.appVersion || '';
    if (/headless/i.test(appVersion)) {
      this.indicators.push('headless-chrome-app-version');
    }

    if (checkWebGLContext(this.env)) {
      this.indicators.push('webgl-context-mesa-offscreen');
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

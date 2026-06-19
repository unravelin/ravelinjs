/**
 * @fileoverview Heuristics specific to Chromium-based automation (Puppeteer, Playwright,
 * Selenium + ChromeDriver, chromedp, headless Chrome).
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
 * Detects Chromium- and headless-Chrome-specific automation artifacts.
 * Note that integration and unit tests will trigger some of these.
 */
export default class ChromiumAutomationDetector implements detection.Detector {
  public readonly type = 'chromium-automation';
  public readonly precedence = 90;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    const nav = this.env.navigator;

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

/**
 * @fileoverview Heuristics for headless and headless-like browser environments,
 * such as zero window dimensions, HeadlessChrome user agents, empty plugins or
 * languages, the Notification permission inconsistency, and software WebGL
 * renderers. The latter two catch headless Chromium (e.g. default Playwright and
 * Puppeteer) even when nothing else leaks.
 */

/** Renderer strings reported by GPU-less/software WebGL backends. */
const SOFTWARE_RENDERER_PATTERN = /swiftshader|llvmpipe|mesa|software/i;

/**
 * Detects environment fingerprints commonly seen in headless automation.
 */
export default class HeadlessDetector implements detection.Detector {
  public readonly signal = 'headless';
  public readonly precedence = 10;

  public triggered = false;
  public indicators: detection.Indicator[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    this._detectUserAgentAndPlugins();
    this._detectSoftwareWebGL();
    await this._detectNotificationMismatch();

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }

  /** Synchronous user-agent, dimension, plugin, and language heuristics. */
  private _detectUserAgentAndPlugins(): void {
    const nav = this.env.navigator || ({} as Navigator);

    if (this.env.outerWidth === 0 && this.env.outerHeight === 0) {
      // Common headless tell, but legitimately possible before the window sizes.
      this.indicators.push({ id: 'zero-outer-dimensions', confidence: 30 });
    }

    const appVersion = nav.appVersion || '';
    if (/headless/i.test(appVersion)) {
      this.indicators.push({ id: 'headless-app-version', confidence: 100 });
    }

    const userAgent = nav.userAgent || '';
    if (/HeadlessChrome/i.test(userAgent)) {
      this.indicators.push({ id: 'headless-chrome-user-agent', confidence: 100 });
    }

    if (nav.languages && nav.languages.length === 0) {
      this.indicators.push({ id: 'no-languages', confidence: 30 });
    }

    if (nav.plugins && nav.plugins.length === 0) {
      // Weak on its own: modern non-Chromium browsers legitimately report none.
      this.indicators.push({ id: 'no-plugins', confidence: 30 });
    }
  }

  /**
   * A software WebGL backend (SwiftShader/llvmpipe/Mesa) indicates a GPU-less
   * environment, typical of headless Chromium.
   */
  private _detectSoftwareWebGL(): void {
    const doc = this.env.document;
    if (typeof doc?.createElement !== 'function') {
      return;
    }

    let gl: WebGLRenderingContext | null;
    try {
      const canvas = doc.createElement('canvas');
      gl = (canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    } catch {
      return;
    }
    if (!gl) {
      return;
    }

    try {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) {
        return;
      }

      const renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
      if (SOFTWARE_RENDERER_PATTERN.test(renderer)) {
        // GPU-less rendering is typical of headless, but also real VMs/servers.
        this.indicators.push({ id: 'software-webgl-renderer', confidence: 70 });
      }
    } catch {
      // Reading GPU info can throw in locked-down contexts; ignore.
    }
  }

  /**
   * Headless Chrome reports `Notification.permission === 'denied'` while
   * `navigator.permissions.query` reports `'prompt'` for notifications. Real
   * browsers keep these consistent, so a mismatch is a strong headless tell.
   */
  private async _detectNotificationMismatch(): Promise<void> {
    if (this.env.Notification?.permission !== 'denied') {
      return;
    }

    const permissions = this.env.navigator?.permissions;
    if (typeof permissions?.query !== 'function') {
      return;
    }

    try {
      const status = await permissions.query({ name: 'notifications' });
      if (status?.state === 'prompt') {
        // A well-established headless Chrome inconsistency.
        this.indicators.push({ id: 'permission-mismatch', confidence: 80 });
      }
    } catch {
      // Permission probing is best-effort; ignore failures.
    }
  }
}

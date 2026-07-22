/**
 * @fileoverview Heuristics for headless and headless-like browser environments,
 * such as zero window dimensions, HeadlessChrome user agents, empty plugins or
 * languages, the Notification permission inconsistency, and software WebGL
 * renderers. The latter two catch headless Chromium (e.g. default Playwright and
 * Puppeteer) even when nothing else leaks.
 */

import { PRECEDENCE } from '../precedence.ts';

/** Renderer strings reported by GPU-less/software WebGL backends. */
const SOFTWARE_RENDERER_PATTERN = /swiftshader|llvmpipe|mesa|software/i;

/**
 * Detects environment fingerprints commonly seen in headless automation.
 */
export default class HeadlessDetector implements detection.Detector {
  public readonly signal = 'headless';
  public readonly precedence = PRECEDENCE.GENERIC;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    this._detectUserAgentAndPlugins();
    await this._detectPermissionInconsistency();
    this._detectSoftwareWebGL();

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
      this.indicators.push('zero-outer-dimensions');
    }

    const appVersion = nav.appVersion || '';
    if (/headless/i.test(appVersion)) {
      this.indicators.push('headless-app-version');
    }

    const userAgent = nav.userAgent || '';
    if (/HeadlessChrome/i.test(userAgent)) {
      this.indicators.push('headless-chrome-user-agent');
    }

    if (nav.languages && nav.languages.length === 0) {
      this.indicators.push('no-languages');
    }

    if (nav.plugins && nav.plugins.length === 0) {
      this.indicators.push('no-plugins');
    }
  }

  /**
   * Headless Chrome reports `Notification.permission === 'denied'` while
   * `navigator.permissions.query` reports `'prompt'` for notifications. Real
   * browsers keep these consistent, so a mismatch is a strong headless tell.
   */
  private async _detectPermissionInconsistency(): Promise<void> {
    const nav = this.env.navigator;
    const notification = this.env.Notification;
    if (!nav?.permissions?.query || !notification) {
      return;
    }

    if (notification.permission !== 'denied') {
      return;
    }

    try {
      const status = await nav.permissions.query({ name: 'notifications' });
      if (status?.state === 'prompt') {
        this.indicators.push('permission-mismatch');
      }
    } catch {
      // Permission probing is best-effort; ignore failures.
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
        this.indicators.push('software-webgl-renderer');
      }
    } catch {
      // Reading GPU info can throw in locked-down contexts; ignore.
    }
  }
}

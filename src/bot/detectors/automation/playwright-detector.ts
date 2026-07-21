/**
 * @fileoverview Detects Playwright-specific artifacts, such as the globals and
 * Chrome DevTools Protocol hooks it injects into the page, the device-emulation
 * overrides it installs, and user-agent/eval markers left by some configurations.
 */

/**
 * Globals that Playwright exposes on the page's `window`/`globalThis`. These are
 * strong, direct evidence of a Playwright-driven runtime.
 */
const PLAYWRIGHT_GLOBALS = [
  '__playwright',
  '__playwright__binding__',
  '__pwInitScripts',
  '__pw_manual',
  '__PW_inspect',
  '__pwClock',
  'playwright',
] as const;

/**
 * Globals Playwright installs to emulate a device environment. Present when a
 * test overrides geolocation, permissions, or timezone.
 */
const ENVIRONMENT_SPOOF_GLOBALS = [
  { global: '__pw_geolocation__', indicator: 'geolocation-mock' },
  { global: '__pw_permissions__', indicator: 'permissions-override' },
  { global: '__pw_timezone__', indicator: 'timezone-mock' },
] as const;

/** Chrome DevTools Protocol artifacts left behind by Playwright's transport. */
const PROTOCOL_GLOBALS = [{ global: '__cdpSession__', indicator: 'cdp-session' }] as const;

/**
 * Detects browser automation driven by Playwright.
 */
export default class PlaywrightDetector implements detection.Detector {
  public readonly signal = 'playwright';
  public readonly precedence = 10;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    this._detectGlobals();
    this._detectProtocolArtifacts();
    this._detectEnvironmentSpoofing();
    this._detectUserAgent();
    this._detectEvalMarker();

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }

  /** Direct Playwright runtime globals injected into the page. */
  private _detectGlobals(): void {
    for (const global of PLAYWRIGHT_GLOBALS) {
      if (this.hasGlobal(global)) {
        this.indicators.push(`global-${global}`);
      }
    }
  }

  /** Chrome DevTools Protocol transport artifacts. */
  private _detectProtocolArtifacts(): void {
    for (const { global, indicator } of PROTOCOL_GLOBALS) {
      if (this.hasGlobal(global)) {
        this.indicators.push(indicator);
      }
    }
  }

  /** Device-emulation overrides (geolocation, permissions, timezone). */
  private _detectEnvironmentSpoofing(): void {
    for (const { global, indicator } of ENVIRONMENT_SPOOF_GLOBALS) {
      if (this.hasGlobal(global)) {
        this.indicators.push(indicator);
      }
    }
  }

  /** User-agent substring left by some Playwright configurations. */
  private _detectUserAgent(): void {
    const userAgent = this.env.navigator?.userAgent ?? '';
    if (/Playwright/i.test(userAgent)) {
      this.indicators.push('playwright-user-agent');
    }
  }

  /** Playwright markers occasionally embedded in patched `eval` sources. */
  private _detectEvalMarker(): void {
    try {
      const evalStr = this.env.eval?.toString?.() ?? '';
      if (/playwright/i.test(evalStr)) {
        this.indicators.push('eval-playwright-marker');
      }
    } catch {
      // A throwing `toString` is not itself evidence of Playwright; ignore it.
    }
  }

  /** Safe presence check for a global that tolerates a missing environment. */
  private hasGlobal(name: string): boolean {
    try {
      return name in this.env;
    } catch {
      return false;
    }
  }
}

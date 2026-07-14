/**
 * @fileoverview Detects Playwright-specific artifacts.
 */

export default class PlaywrightDetector implements detection.Detector {
  // Bot detector metadata
  public readonly signal = 'playwright';
  public readonly precedence = 10;

  // Detection results
  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    const playwrightGlobals = [
      '__playwright',
      '__playwright__binding__',
      '__pwInitScripts',
      '__pw_manual',
      '__pwInitScripts',
      'playwright',
    ];

    for (const global of playwrightGlobals) {
      if (global in this.env) {
        this.indicators.push(`global-${global}`);
      }
    }

    const userAgent = navigator.userAgent || '';
    if (/Playwright/i.test(userAgent)) {
      this.indicators.push('playwright-user-agent');
    }

    try {
      const evalStr = this.env.eval?.toString?.() ?? '';
      if (/playwright/i.test(evalStr)) {
        this.indicators.push('eval-playwright-marker');
      }
    } catch {
      // Ignore
    }

    // Check for Playwright's geolocation mock
    if ('__pw_geolocation__' in this.env) {
      this.indicators.push('geolocation-mock');
    }

    // Check for Playwright's permission override
    if ('__pw_permissions__' in this.env) {
      this.indicators.push('permissions-override');
    }

    // Check for Playwright's timezone mock
    if ('__pw_timezone__' in this.env) {
      this.indicators.push('timezone-mock');
    }

    // Check CDP session artifacts
    if ('__cdpSession__' in this.env) {
      this.indicators.push('cdp-session');
    }

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }
}

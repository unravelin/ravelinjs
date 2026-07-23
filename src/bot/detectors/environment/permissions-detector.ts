/**
 * @fileoverview Permission-state heuristics that reveal headless/automated
 * Chromium. These compare what the Permissions API reports against what a real
 * browser would report, catching environments (e.g. default Playwright and
 * Puppeteer) that leak nothing else obvious.
 */

/**
 * Detects headless/automated environments via inconsistent Permissions API state.
 */
export default class PermissionsDetector implements detection.Detector {
  public readonly signal = 'permissions';
  public readonly precedence = 10;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    await this._detectNotificationMismatch();

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
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

    const state = await this._queryPermissionState('notifications');
    if (state === 'prompt') {
      this.indicators.push('permission-mismatch');
    }
  }

  /**
   * Best-effort read of a permission's state, returning `undefined` when the
   * Permissions API is unavailable or the query fails (e.g. unsupported name).
   */
  private async _queryPermissionState(name: PermissionName): Promise<PermissionState | undefined> {
    const permissions = this.env.navigator?.permissions;
    if (typeof permissions?.query !== 'function') {
      return undefined;
    }

    try {
      const status = await permissions.query({ name });
      return status?.state;
    } catch {
      return undefined;
    }
  }
}

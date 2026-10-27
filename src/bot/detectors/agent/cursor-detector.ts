/**
 * @fileoverview Detects Cursor's embedded browser, the shell used by Cursor's
 * agent. It identifies itself with a `Cursor/` + `Electron/` user agent and
 * injects fixed globals such as `__cursorDevToolsInjected` and the dialog
 * override hooks. These are direct artifacts of that browser, including when
 * a person loads the page in it.
 */

/** Fixed globals Cursor's embedded browser injects onto `window`. */
const CURSOR_GLOBALS = [
  '__cursorDevToolsInjected',
  '__cursorDialogOverridesApplied',
  '__cursorDialogConfig',
  '__cursorSetDialogConfig',
  '__cursorGetDialogHistory',
  '__cursorClearDialogHistory',
  'cursorPasskey',
];

/**
 * Detects Cursor's embedded browser via its user agent and injected globals.
 */
export default class CursorDetector implements detection.Detector {
  public readonly signal = 'cursor';
  public readonly category = 'agent';
  public readonly precedence = 25;

  public triggered = false;
  public indicators: detection.Indicator[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    this._detectUserAgent();
    this._detectGlobals();

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      category: this.category,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }

  /** `Cursor/` together with `Electron/` is the embedded browser's user agent. */
  private _detectUserAgent(): void {
    const userAgent = this.env.navigator?.userAgent || '';
    if (/Cursor\//.test(userAgent) && /Electron\//.test(userAgent)) {
      // The product token plus Electron is the embedded browser's own UA.
      this.indicators.push({ id: 'cursor-user-agent', confidence: 95 });
    }
  }

  /** Fixed-name Cursor globals on `window`. */
  private _detectGlobals(): void {
    for (const global of CURSOR_GLOBALS) {
      if (global in this.env) {
        // A fixed Cursor global is a direct artifact of the embedded browser.
        this.indicators.push({ id: `global-${global}`, confidence: 95 });
      }
    }
  }
}

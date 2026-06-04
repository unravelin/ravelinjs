/**
 * @fileoverview Detects Electron (Chromium + Node embedded) fingerprints.
 */

function collectElectronPrefixedKeys(target: object): string[] {
  const found: string[] = [];
  try {
    for (const key of Object.getOwnPropertyNames(target)) {
      if (key.startsWith('__electron')) {
        found.push(key);
      }
    }
  } catch {
    // Ignore
  }
  return found;
}

function hasElectronUserAgent(userAgent: string): boolean {
  return /\sElectron\//i.test(userAgent) || /Electron/i.test(userAgent);
}

/**
 * Detects Electron-hosted pages. Chromium-wide automation signals are handled by
 * `headless-chrome-detector.ts`. With context isolation, `process` is often hidden;
 * the default user agent usually still contains `Electron/x.y.z`.
 */
export default class ElectronDetector implements detection.Detector {
  public readonly type = 'electron';
  public readonly precedence = 10;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    const userAgent = this.env.navigator?.userAgent || '';
    if (hasElectronUserAgent(userAgent)) {
      this.indicators.push('electron-user-agent');
    }

    const appVersion = this.env.navigator?.appVersion || '';
    if (/electron/i.test(appVersion)) {
      this.indicators.push('electron-app-version');
    }

    const electronVersion = this.env.process?.versions?.electron;
    if (typeof electronVersion === 'string' && electronVersion.length > 0) {
      this.indicators.push('process-versions-electron');
    }

    if (this.env.process?.type === 'renderer' && this.env.process?.versions?.electron != null) {
      this.indicators.push('process-renderer-electron');
    }

    if (this.env.electron != null) {
      this.indicators.push('electron-global');
    }

    for (const key of collectElectronPrefixedKeys(this.env)) {
      this.indicators.push(`global-${key}`);
    }

    try {
      const evalStr = this.env.eval?.toString?.() ?? '';
      if (/electron/i.test(evalStr)) {
        this.indicators.push('eval-electron-marker');
      }
    } catch {
      // Ignore
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

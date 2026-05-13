import createAutomationDetectors from './detectors/automation';

export interface BotDetectionResult {
  /** True if any indicator triggered. */
  bot: boolean;
  /** Per-indicator outcomes in registration order. */
  results: detection.DetectionResult[];
}

export interface BotDetectorOptions {
  /** Appended after built-in detectors. */
  detectors?: detection.Detector[];
  /**
   * Override the object inspected (for unit tests). Defaults to `globalThis`.
   * Do not rely on the real browser in CI: ChromeHeadless and other hosts may set
   * automation-related properties unpredictably.
   */
  env?: detection.Environment;
}

/**
 * Runs a set of lightweight automation / bot indicators. Results are heuristics
 * (`navigator.webdriver` is true under legitimate WebDriver, etc.); use for
 * scoring or hints, not as a sole gate.
 */
export class BotDetector {
  private readonly detectors: detection.Detector[] = [];
  private readonly _env: detection.Environment;

  private _detectionResult?: Promise<BotDetectionResult>;

  public constructor(options?: BotDetectorOptions) {
    this._env = options?.env ?? (globalThis as detection.Environment);
    // TODO: For now register all indicators. This should be configurable in the future.
    this.register(createAutomationDetectors(this._env));
  }

  /** Append an detector (runs after built-ins and any constructor `indicators`). */
  public register(detector: detection.Detector | detection.Detector[]): void {
    if (Array.isArray(detector)) {
      this.detectors.push(...detector);
    } else {
      this.detectors.push(detector);
    }
  }

  /** Evaluate every registered detector (parallel). */
  public async detect(): Promise<BotDetectionResult> {
    if (this._detectionResult) {
      return this._detectionResult;
    }

    const results: detection.DetectionResult[] = [];

    await Promise.all(
      this.detectors.map(async detector => {
        const result = await detector.detect();

        results.push(result);
      })
    );

    this._detectionResult = Promise.resolve({
      results,
      bot: results.some(result => result.triggered),
    });

    return this._detectionResult;
  }
}

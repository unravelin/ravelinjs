import createAutomationDetectors from './detectors/automation';

export interface BotDetectionResult {
  /** True if any indicator triggered. */
  bot: boolean;
  /** The detected bot type. */
  type?: detection.BotType;
  /** Indicators that triggered. */
  indicators?: Partial<Record<detection.BotType, boolean>>;
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

  private _detectionResult?: BotDetectionResult;

  public constructor(options?: BotDetectorOptions) {
    this._env = options?.env ?? (globalThis as detection.Environment);
    // TODO: For now register all indicators. This should be configurable in the future.
    this.register(createAutomationDetectors(this._env));
    if (options?.detectors) {
      this.register(options.detectors);
    }
  }

  /** Append a detector (runs after built-ins and any constructor `detectors`). */
  public register(detector: detection.Detector | detection.Detector[]): void {
    if (Array.isArray(detector)) {
      this.detectors.push(...detector);
    } else {
      this.detectors.push(detector);
    }
  }

  private _buildResult(results: detection.DetailedDetectionResult[]): BotDetectionResult {
    const triggered = results.filter(result => result.triggered);
    const primary =
      triggered.length > 0
        ? triggered.reduce((best, result) => (result.precedence < best.precedence ? result : best))
        : undefined;

    return {
      bot: triggered.length > 0,
      type: primary?.type,
      indicators: triggered.reduce(
        (acc, result) => ({ ...acc, [result.type]: result.indicators }),
        {}
      ),
    };
  }

  /** Evaluate every registered detector (parallel). */
  public async detect(): Promise<BotDetectionResult> {
    if (this._detectionResult) {
      return this._detectionResult;
    }

    const results: detection.DetailedDetectionResult[] = [];

    await Promise.all(
      this.detectors.map(async detector => {
        const result = await detector.detect();
        results.push(result);
      })
    );

    this._detectionResult = this._buildResult(results);

    return this._detectionResult;
  }
}

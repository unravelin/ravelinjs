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
  /**
   * Allow injecting an environment option for unit tests.
   */
  env?: detection.Environment;
}

/**
 * Main entry point for bot detection. Runs the defined detectors and builds
 * the final detection result.
 */
export class BotDetector {
  private readonly detectors: detection.Detector[] = [];
  private readonly _env: detection.Environment;

  private _detectionResult?: BotDetectionResult;

  public constructor(options?: BotDetectorOptions) {
    this._env = options?.env ?? (globalThis as detection.Environment);

    // TODO: In the future, we can add different categories of detectors. We could
    // also allow these to be configurable by passing in options to this constructor.
    this.register(createAutomationDetectors(this._env));
  }

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

  /** Evaluate every registered detector in parallel. */
  public async detect(): Promise<BotDetectionResult> {
    // If we've already run the detetion, return the cached result.
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

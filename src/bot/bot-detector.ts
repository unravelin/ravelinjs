import createAutomationDetectors from './detectors/automation';
import createEnvironmentDetectors from './detectors/environment';

export interface BotDetectionResult {
  /** The verdict of the detection result. */
  verdict: detection.Verdict;
  /** The detected signal. */
  signal?: detection.Signal;
  /** Indicators that triggered, keyed by signal. */
  indicators?: Partial<Record<detection.Signal, detection.Indicator[]>>;
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
    this.register([
      ...createAutomationDetectors(this._env),
      ...createEnvironmentDetectors(this._env),
    ]);
  }

  public register(detector: detection.Detector | detection.Detector[]): void {
    if (Array.isArray(detector)) {
      this.detectors.push(...detector);
    } else {
      this.detectors.push(detector);
    }
  }

  /** Evaluate every registered detector in parallel. */
  public async detect(): Promise<BotDetectionResult> {
    // If we've already run the detection, return the cached result.
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

  private _buildResult(results: detection.DetailedDetectionResult[]): BotDetectionResult {
    const triggered = results.filter(result => result.triggered);
    const primary =
      triggered.length > 0
        ? triggered.reduce((best, result) => (result.precedence > best.precedence ? result : best))
        : undefined;

    let verdict: detection.Verdict = 'human';
    if (triggered.length === 1) {
      // If only one signal is triggered, it's suspicious.
      verdict = 'suspectedBot';
    } else if (triggered.length > 1) {
      // If multiple signals are triggered, we can assume it's a bot.
      verdict = 'bot';
    }

    return {
      verdict,
      signal: primary?.signal,
      indicators:
        triggered.length > 0
          ? triggered.reduce((acc, result) => ({ ...acc, [result.signal]: result.indicators }), {})
          : undefined,
    };
  }
}

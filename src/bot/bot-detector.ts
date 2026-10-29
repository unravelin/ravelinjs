import createAgentDetectors from './detectors/agent';
import createAutomationDetectors from './detectors/automation';
import createEnvironmentDetectors from './detectors/environment';

export interface BotDetectionResult {
  /** The verdict of the detection result. */
  verdict: detection.Verdict;
  /** The detected signal. */
  signal?: detection.Signal;
  /** Indicators that triggered, keyed by signal. */
  indicators?: Partial<Record<detection.Signal, string[]>>;
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
      ...createAgentDetectors(this._env),
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

    const primaryResults: Partial<Record<detection.Category, detection.DetailedDetectionResult>> =
      {};

    // Sum all of the confidence values for all indicators based on signal caegory.
    // No need to normalise to 100 as any value greater than 90 is considered an agent/bot.
    const scores = triggered.reduce(
      (scores, result) => {
        const currentResult = primaryResults[result.category];
        primaryResults[result.category] =
          result.precedence > (currentResult?.precedence ?? 0) ? result : currentResult;

        scores[result.category] =
          scores[result.category] +
          result.indicators.reduce((sum, indicator) => sum + indicator.confidence, 0);

        return scores;
      },
      { agent: 0, bot: 0 }
    );

    // A verdict of bot implies automation. To differentiate suspected agent vs bot
    // traffic we add the category to the returned results, with precedence given
    // to the agent category.
    let verdict: detection.Verdict;
    let category: detection.Category | undefined;
    if (scores.agent > 90 || scores.bot > 90) {
      verdict = 'bot';
      category = scores.agent > 90 ? 'agent' : 'bot';
    } else if (scores.bot > 50 || scores.agent > 50) {
      // Suspicious automation activity.
      verdict = 'suspectedBot';
      category = scores.agent > 50 ? 'agent' : 'bot';
    } else {
      verdict = 'human';
    }

    const indicators =
      triggered.length > 0
        ? triggered.reduce<Partial<Record<detection.Signal, string[]>>>((acc, result) => {
            acc[result.signal] = result.indicators.map(indicator => indicator.id);
            return acc;
          }, {})
        : undefined;

    return {
      verdict,
      signal: primaryResults[category!]?.signal,
      indicators,
    };
  }
}

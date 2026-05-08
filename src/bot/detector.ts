import createAutomationDetectors from './detectors/automation';

/** Global object used for property reads (defaults to `globalThis`; inject a stub in tests). */
export type DetectorEnv = Window & typeof globalThis;

export interface BotDetectionResult {
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
  env?: DetectorEnv;
}

/**
 * Runs a set of lightweight automation / bot indicators. Results are heuristics
 * (`navigator.webdriver` is true under legitimate WebDriver, etc.); use for
 * scoring or hints, not as a sole gate.
 */
export class AutomationDetector {
  private readonly detectors: detection.Detector[] = [];
  // private readonly env: DetectorEnv;

  public constructor(options?: BotDetectorOptions) {
    // this.env = options?.env ?? (globalThis as DetectorEnv);
    // TODO: For now register all indicators. This should be configurable in the future.
    this.register(createAutomationDetectors());
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
    const results: detection.DetectionResult[] = [];

    await Promise.all(
      this.detectors.map(async detector => {
        const result = await detector.detect();

        results.push(result);
      })
    );

    return { results };
  }
}

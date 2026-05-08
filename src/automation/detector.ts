import { defaultIndicators } from './indicators/default-indicators';
import { DetectionResult, Detector } from './indicators/detector';

/** Global object used for property reads (defaults to `globalThis`; inject a stub in tests). */
export type DetectorEnv = Window & typeof globalThis;

export interface AutomationDetectionResult {
  /** Per-indicator outcomes in registration order. */
  results: DetectionResult[];
}

export interface AutomationDetectorOptions {
  /** Appended after built-in detectors. */
  detectors?: Detector[];
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
  private readonly detectors: Detector[] = [];
  // private readonly env: DetectorEnv;

  public constructor(options?: AutomationDetectorOptions) {
    // this.env = options?.env ?? (globalThis as DetectorEnv);

    // TODO: For now register all indicators. This should be configurable in the future.
    this.register(defaultIndicators);
  }

  /** Append an detector (runs after built-ins and any constructor `indicators`). */
  public register(detector: Detector | Detector[]): void {
    if (Array.isArray(detector)) {
      this.detectors.push(...detector);
    } else {
      this.detectors.push(detector);
    }
  }

  /** Evaluate every registered detector (parallel). */
  public async detect(): Promise<AutomationDetectionResult> {
    const results: DetectionResult[] = [];

    await Promise.all(
      this.detectors.map(async detector => {
        const result = await detector.run();

        results.push(result);
      })
    );

    return { results };
  }
}

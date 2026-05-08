interface DetectionIndicator {
  id: string;
  name: string;
  description: string;
  category: string;
  // score: number;
}

interface DetectorDetails {
  /** Unique identifier for this detector. */
  id: string;
  /** Human-readable label for logs. */
  name: string;
  /** Optional grouping (e.g. `selenium`, `webdriver`). */
  category: string;
  /** Optional description for this indicator. */
  description: string;
}

// TODO: Not really sure on the shape of this yet.
interface Result {
  /** Indicators that triggered. */
  indicators: DetectionIndicator[];
  /** True if any indicator triggered. */
  triggered: boolean;
}

export type DetectionResult = Result & DetectorDetails;

/**
 * Base Detector class. All detectors should extend this class.
 */
export abstract class Detector {
  /** Unique identifier for this detector. */
  public readonly id: string;
  /** Human-readable label for logs. */
  public readonly name: string;
  /** Optional grouping (e.g. `selenium`, `webdriver`). */
  public readonly category: string;
  /** Optional description for this indicator. */
  public readonly description: string;

  /** Cached detection result. */
  private _result: Result | undefined; // Define a type for this

  /**
   * Abstract detection method for the detector; to be implemented by the subclass.
   */
  public abstract detect(): Result;

  /**
   * Runs the detect method and caches the result.
   * @returns The detection result.
   */
  public async run(): Promise<DetectionResult> {
    if (this._result != null) {
      return this.enrichResult(this._result);
    }

    this._result = await this.detect();

    return this.enrichResult(this._result);
  }

  private enrichResult(result: Result): DetectionResult {
    return {
      ...result,
      id: this.id,
      name: this.name,
      category: this.category,
      description: this.description,
    };
  }
}

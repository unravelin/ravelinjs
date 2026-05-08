declare namespace detection {
  interface DetectionIndicator {
    id: string;
    name: string;
    description: string;
    category: string;
    // score: number;
  }

  interface DetectionResult {
    /** Indicators that triggered. */
    indicators: DetectionIndicator[];
    /** True if any indicator triggered. */
    triggered: boolean;
  }

  interface Detector {
    /** Unique identifier for this detector. */
    id: string;
    /** Human-readable label for logs. */
    name: string;
    /** Optional grouping (e.g. `selenium`, `webdriver`). */
    category: string;
    /** Optional description for this indicator. */
    description: string;

    /**
     * Detection method for the detector; to be implemented by the subclass.
     */
    detect: () => Promise<DetectionResult>;
  }
}

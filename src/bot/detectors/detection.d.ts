declare namespace detection {
  /** Global object used for property reads (defaults to `globalThis`; inject a stub in tests). */
  type Environment = Window & typeof globalThis;

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

  interface Detector extends DetectorDetails {
    /**
     * Detection method for the detector; to be implemented by the subclass.
     */
    detect: () => Promise<DetectionResult>;
  }

  interface DetectionResult {
    /** Indicators that triggered. */
    indicators: string[];
    /** True if any indicator triggered. */
    triggered: boolean;
  }

  type EnrichedDetectionResult = DetectionResult & DetectorDetails;
}

declare namespace detection {
  /** Global object used for property reads (defaults to `globalThis`; inject a stub in tests). */
  type Environment = Window & typeof globalThis;
  type Signal = 'headless' | 'webdriver';

  // Using an enum allows us to possibly extend to add more in the future. For
  // example, we could add 'agent' if we add support for agent detection.
  type Verdict = 'bot' | 'suspicious' | 'human';

  interface DetectorMetadata {
    /** The signal name that a detector is checking for. */
    signal: Signal;
    /** The precedence of the detection result. When building the bot detection result,
     * the highest precedence result will be used. If multiple results have the same precedence,
     * the first one will be used. (Higher numbers are higher precedence.) */
    precedence: number;
  }

  interface DetectionResult {
    /** Indicators that triggered. */
    indicators: string[];
    /** True if any indicator triggered. */
    triggered?: boolean;
  }

  type DetailedDetectionResult = DetectorMetadata & DetectionResult;

  interface Detector extends DetailedDetectionResult {
    detect(): Promise<DetailedDetectionResult>;
  }
}

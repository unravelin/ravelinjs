declare namespace detection {
  /** Global object used for property reads (defaults to `globalThis`; inject a stub in tests). */
  type Environment = Window & typeof globalThis;
  type Signal = 'chromedriver' | 'headless' | 'webdriver';

  // Using an enum allows us to possibly extend to add more in the future. For
  // example, we could add 'agent' if we add support for agent detection.
  type Verdict = 'bot' | 'suspectedBot' | 'human';

  interface DetectorMetadata {
    /** The signal name that a detector is checking for. */
    signal: Signal;
    /** The precedence of the detection result. When building the bot detection result,
     * the highest precedence result will be used. If multiple results have the same precedence,
     * the first one will be used. (Higher numbers are higher precedence.) */
    precedence: number;
  }

  interface Indicator {
    id: string;
    /**
     * Likelihood the indicator reflects a bot rather than a human, where 100
     * means definitely a bot and 0 means definitely a human.
     */
    confidence: number;
  }

  interface DetectionResult {
    /** Indicators that triggered. */
    indicators: Indicator[];
    /** True if any indicator triggered. */
    triggered?: boolean;
  }

  type DetailedDetectionResult = DetectorMetadata & DetectionResult;

  interface Detector extends DetailedDetectionResult {
    detect(): Promise<DetailedDetectionResult>;
  }
}

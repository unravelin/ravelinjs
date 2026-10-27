declare namespace detection {
  /** Global object used for property reads (defaults to `globalThis`; inject a stub in tests). */
  type Environment = Window & typeof globalThis;

  type Agent = 'claude' | 'cursor' | 'muse';
  type Bot = 'chromedriver' | 'headless' | 'webdriver';

  type Signal = Agent | Bot;
  type Category = 'agent' | 'bot';

  // 'agent' is a category verdict (a coding/agent browser surface), distinct
  // from the confidence tiers below; it is reported whenever an agent detector
  // triggers. See BotDetector._buildResult.
  type Verdict = 'agent' | 'bot' | 'suspectedBot' | 'human';

  interface DetectorMetadata {
    /** The signal name that a detector is checking for. */
    signal: Signal;
    /** The category of this detector. */
    category: Category;
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

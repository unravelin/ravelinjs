declare namespace detection {
  /** Global object used for property reads (defaults to `globalThis`; inject a stub in tests). */
  type Environment = Window & typeof globalThis;
  type BotType =
    | 'chromeMDP'
    | 'headless-chrome'
    | 'phantomJS'
    | 'playwright'
    | 'puppeteer'
    | 'selenium'
    | 'slimerJS'
    | 'electron';

  interface DetectorMetadata {
    /** The detected bot type. */
    type: BotType;
    /** The category of the detected bot. */
    category: string;
    /** The precedence of the detection result. When building the bot detection result,
     * the highest precedence result will be used. If multiple results have the same precedence,
     * the first one will be used. (Lower numbers are higher precedence.) */
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

  type DetectFunction = () => Promise<DetailedDetectionResult>;
}

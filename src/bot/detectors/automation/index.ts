import PlaywrightDetector from './playwright-detector';
import WebDriverDetector from './webdriver-detector';

export default function createAutomationDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [new WebDriverDetector(env), new PlaywrightDetector(env)];
}

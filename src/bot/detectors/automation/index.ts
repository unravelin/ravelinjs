import ChromeDriverDetector from './chromedriver-detector';
import WebDriverDetector from './webdriver-detector';

export default function createAutomationDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [new ChromeDriverDetector(env), new WebDriverDetector(env)];
}

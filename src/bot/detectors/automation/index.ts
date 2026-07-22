import CDPDetector from './cdp-detector';
import ChromeDriverDetector from './chromedriver-detector';
import WebDriverDetector from './webdriver-detector';

export default function createAutomationDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [new WebDriverDetector(env), new ChromeDriverDetector(env), new CDPDetector(env)];
}

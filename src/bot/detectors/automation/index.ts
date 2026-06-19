import BrowserAutomationDetector from './browser-automation-detector';
import HeadlessChromeDetector from './headless-chrome-detector';

export default function createAutomationDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [new BrowserAutomationDetector(env), new HeadlessChromeDetector(env)];
}

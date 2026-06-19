import BrowserAutomationDetector from './browser-automation-detector';
import ChromiumAutomationDetector from './chromium-automation-detector';

export default function createAutomationDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [new BrowserAutomationDetector(env), new ChromiumAutomationDetector(env)];
}

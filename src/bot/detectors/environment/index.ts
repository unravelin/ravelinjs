import HeadlessDetector from './headless-detector';
import WebdriverDetector from './webdriver-detector';

export default function createEnvironmentDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [new HeadlessDetector(env), new WebdriverDetector(env)];
}

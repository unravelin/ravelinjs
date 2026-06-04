import HeadlessChromeDetector from './headless-chrome-detector';

export default function createAutomationDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [new HeadlessChromeDetector(env)];
}

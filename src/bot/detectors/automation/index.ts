import WebDriverDetector from './web-driver-detector';

export default function createEnvironmentDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [new WebDriverDetector(env)];
}

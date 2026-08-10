import HeadlessDetector from './headless-detector';

export default function createEnvironmentDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [new HeadlessDetector(env)];
}

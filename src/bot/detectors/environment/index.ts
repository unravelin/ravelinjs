import HeadlessDetector from './headless-detector';
import PermissionsDetector from './permissions-detector';

export default function createEnvironmentDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [new HeadlessDetector(env), new PermissionsDetector(env)];
}

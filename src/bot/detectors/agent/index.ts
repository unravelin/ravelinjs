import CursorDetector from './cursor-detector';
import MuseDetector from './muse-detector';

export default function createAgentDetectors(env: detection.Environment): detection.Detector[] {
  return [new CursorDetector(env), new MuseDetector(env)];
}

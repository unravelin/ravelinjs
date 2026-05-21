/**
 * @fileoverview Detects PhantomJS (legacy headless WebKit) fingerprints.
 */

/**
 * PhantomJS exposed several distinctive globals and a characteristic user agent.
 * Phantom is unmaintained but still useful to detect for legacy traffic or spoofed UAs.
 */
export default function createPhantomJSDetector(env: detection.Environment): detection.Detector {
  const id = 'phantomjs';
  const name = 'PhantomJS';
  const category = 'automation';
  const description = 'Detects PhantomJS runtime artifacts';

  async function detect(): Promise<detection.DetectionResult> {
    const indicators: string[] = [];

    // Check for PhantomJS-specific globals
    if (typeof env.callPhantom === 'function') {
      indicators.push('callPhantom');
    }

    if (env._phantom != null) {
      indicators.push('_phantom');
    }

    if (env.phantom != null) {
      indicators.push('phantom-global');
    }

    // Check for PhantomJS user agent
    const userAgent = env.navigator?.userAgent || '';
    if (/PhantomJS/i.test(userAgent)) {
      indicators.push('phantomjs-user-agent');
    }

    const triggered = indicators.length > 0;

    return Promise.resolve({
      id,
      indicators,
      triggered,
    });
  }

  return {
    id,
    name,
    category,
    description,
    detect,
  };
}

import { expect } from 'chai';
import BrowserAutomationDetector from '../../../../src/bot/detectors/automation/browser-automation-detector.ts';

/**
 * @param {Record<string, unknown>} [overrides]
 * @returns {detection.Environment}
 */
function makeEnv(overrides = {}) {
  const { document: documentOverrides, ...rest } = overrides;
  return {
    navigator: {
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
      plugins: { length: 1 },
      languages: ['en'],
    },
    outerWidth: 1920,
    outerHeight: 1080,
    document: {
      createElement: () => ({ getContext: () => null }),
      ...documentOverrides,
    },
    ...rest,
  };
}

describe('BrowserAutomationDetector', function () {
  it('exposes detector metadata', async function () {
    const detector = new BrowserAutomationDetector(makeEnv());
    const result = await detector.detect();

    expect(detector.type).to.equal('browser-automation');
    expect(result.type).to.equal('browser-automation');
  });

  it('does not trigger when no automation artifacts are present', async function () {
    const result = await new BrowserAutomationDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
  });

  it('detects navigator.webdriver', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Safari/605.1.15',
        webdriver: true,
        languages: ['en'],
      },
    });
    const result = await new BrowserAutomationDetector(env).detect();

    expect(result.indicators).to.include('navigator-webdriver');
  });

  it('detects document webdriver attribute', async function () {
    const env = makeEnv({
      document: {
        documentElement: {
          hasAttribute: name => name === 'webdriver',
        },
      },
    });
    const result = await new BrowserAutomationDetector(env).detect();

    expect(result.indicators).to.include('document-element-webdriver-attr');
  });

  it('detects empty navigator.languages', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Safari/605.1.15',
        languages: [],
      },
    });
    const result = await new BrowserAutomationDetector(env).detect();

    expect(result.indicators).to.include('empty-navigator-languages');
  });

  it('detects zero outer window dimensions', async function () {
    const env = makeEnv({ outerWidth: 0, outerHeight: 0 });
    const result = await new BrowserAutomationDetector(env).detect();

    expect(result.indicators).to.include('zero-outer-dimensions');
  });

  it('detects headless in appVersion', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Safari/605.1.15',
        appVersion: '5.0 (headless)',
        languages: ['en'],
      },
    });
    const result = await new BrowserAutomationDetector(env).detect();

    expect(result.indicators).to.include('headless-app-version');
  });
});

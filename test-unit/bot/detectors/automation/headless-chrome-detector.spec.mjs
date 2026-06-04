import { expect } from 'chai';
import HeadlessChromeDetector from '../../../../src/bot/detectors/automation/headless-chrome-detector.ts';

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

describe('HeadlessChromeDetector', function () {
  it('exposes detector metadata', async function () {
    const detector = new HeadlessChromeDetector(makeEnv());
    const result = await detector.detect();

    expect(detector.type).to.equal('headless-chrome');
    expect(result.type).to.equal('headless-chrome');
  });

  it('does not trigger when no Chromium automation artifacts are present', async function () {
    const result = await new HeadlessChromeDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
  });

  it('detects navigator.webdriver', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
        webdriver: true,
        plugins: { length: 1 },
        languages: ['en'],
      },
    });
    const result = await new HeadlessChromeDetector(env).detect();

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
    const result = await new HeadlessChromeDetector(env).detect();

    expect(result.indicators).to.include('document-element-webdriver-attr');
  });

  it('detects legacy CDP artifacts on the environment', async function () {
    const env = makeEnv({ cdc_adoQpoasnfa76pfcZLmcfl_Promise: {} });
    const result = await new HeadlessChromeDetector(env).detect();

    expect(result.indicators).to.include('cdp-artifacts');
  });

  it('detects chromedriver-injected globals', async function () {
    const env = makeEnv({ $cdc_foo: true });
    const result = await new HeadlessChromeDetector(env).detect();

    expect(result.indicators).to.include('chromedriver-injected-global');
  });

  it('detects HeadlessChrome in the user agent', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 HeadlessChrome/120.0.0.0',
        plugins: { length: 1 },
        languages: ['en'],
      },
    });
    const result = await new HeadlessChromeDetector(env).detect();

    expect(result.indicators).to.include('headless-chrome-user-agent');
  });

  it('detects missing chrome.runtime on Chromium', async function () {
    const env = makeEnv({ chrome: {} });
    const result = await new HeadlessChromeDetector(env).detect();

    expect(result.indicators).to.include('chrome-runtime-missing');
  });

  it('does not flag chrome.runtime when it is present', async function () {
    const env = makeEnv({ chrome: { runtime: {} } });
    const result = await new HeadlessChromeDetector(env).detect();

    expect(result.indicators).to.not.include('chrome-runtime-missing');
  });

  it('detects empty plugins on Chromium', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
        plugins: { length: 0 },
        languages: ['en'],
      },
    });
    const result = await new HeadlessChromeDetector(env).detect();

    expect(result.indicators).to.include('empty-plugins-chrome');
  });

  it('detects empty navigator.languages', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
        plugins: { length: 1 },
        languages: [],
      },
    });
    const result = await new HeadlessChromeDetector(env).detect();

    expect(result.indicators).to.include('empty-navigator-languages');
  });

  it('detects zero outer window dimensions', async function () {
    const env = makeEnv({ outerWidth: 0, outerHeight: 0 });
    const result = await new HeadlessChromeDetector(env).detect();

    expect(result.indicators).to.include('zero-outer-dimensions');
  });

  it('detects headless user-agent data brands', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
        plugins: { length: 1 },
        languages: ['en'],
        userAgentData: {
          brands: [
            { brand: 'Chromium', version: '120' },
            { brand: 'Not_A Brand', version: '24' },
          ],
        },
      },
    });
    const result = await new HeadlessChromeDetector(env).detect();

    expect(result.indicators).to.include('user-agent-data-missing-google-chrome-brand');
  });

  it('detects denied notifications permission', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
        plugins: { length: 1 },
        languages: ['en'],
        permissions: {
          query: async () => ({ state: 'denied' }),
        },
      },
    });
    const result = await new HeadlessChromeDetector(env).detect();

    expect(result.indicators).to.include('permissions-notifications-denied');
  });

  it('detects Mesa offscreen WebGL renderer', async function () {
    const env = makeEnv({
      document: {
        createElement: () => ({
          getContext: () => ({
            VENDOR: 0x1f00,
            RENDERER: 0x1f01,
            getParameter: param => {
              if (param === 0x1f00) return 'Brian Paul';
              if (param === 0x1f01) return 'Mesa OffScreen';
            },
          }),
        }),
      },
    });
    const result = await new HeadlessChromeDetector(env).detect();

    expect(result.indicators).to.include('webgl-context-mesa-offscreen');
  });
});

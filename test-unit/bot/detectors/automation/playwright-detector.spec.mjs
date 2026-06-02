import { expect } from 'chai';
import PlaywrightDetector from '../../../../src/bot/detectors/automation/playwright-detector.ts';

/**
 * @param {Record<string, unknown>} [overrides]
 * @returns {detection.Environment}
 */
function makeEnv(overrides = {}) {
  return {
    navigator: { userAgent: 'Mozilla/5.0 Chrome/120.0.0.0' },
    ...overrides,
  };
}

describe('PlaywrightDetector', function () {
  beforeEach(function () {
    delete globalThis.__playwright__binding__;
    delete globalThis.__pwInitScripts;
    delete globalThis.__pw_custom;
  });

  afterEach(function () {
    delete globalThis.__playwright__binding__;
    delete globalThis.__pwInitScripts;
    delete globalThis.__pw_custom;
  });

  it('does not trigger when no Playwright artifacts are present', async function () {
    const result = await new PlaywrightDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
    expect(result.type).to.equal('playwright');
    expect(result.category).to.equal('automation');
  });

  it('detects known Playwright globals', async function () {
    const env = makeEnv({
      __playwright__binding__: {},
      __pwInitScripts: [],
    });
    const result = await new PlaywrightDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('global-__playwright__binding__');
    expect(result.indicators).to.include('global-__pwInitScripts');
  });

  it('detects additional __playwright-prefixed globals', async function () {
    const env = makeEnv({ __playwright_custom: true });
    const result = await new PlaywrightDetector(env).detect();

    expect(result.indicators).to.include('global-__playwright_custom');
  });

  it('detects additional __pw-prefixed globals', async function () {
    const env = makeEnv({ __pw_custom: true });
    const result = await new PlaywrightDetector(env).detect();

    expect(result.indicators).to.include('global-__pw_custom');
  });

  it('detects playwright in eval.toString()', async function () {
    const env = makeEnv({
      eval: Object.assign(() => {}, {
        toString: () => 'function eval() { /* playwright */ }',
      }),
    });
    const result = await new PlaywrightDetector(env).detect();

    expect(result.indicators).to.include('eval-playwright-marker');
  });

  it('ignores eval.toString() errors', async function () {
    const env = makeEnv({
      eval: Object.assign(() => {}, {
        toString: () => {
          throw new Error('eval probe failed');
        },
      }),
    });
    const result = await new PlaywrightDetector(env).detect();

    expect(result.indicators).to.not.include('eval-playwright-marker');
    expect(result.triggered).to.equal(false);
  });
});

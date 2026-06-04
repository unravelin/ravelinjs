import { expect } from 'chai';
import PuppeteerDetector from '../../../../src/bot/detectors/automation/puppeteer-detector.ts';

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

describe('PuppeteerDetector', function () {
  beforeEach(function () {
    delete globalThis.__puppeteer_evaluation_script__;
    delete globalThis.__puppeteer;
    delete globalThis.puppeteer;
  });

  afterEach(function () {
    delete globalThis.__puppeteer_evaluation_script__;
    delete globalThis.__puppeteer;
    delete globalThis.puppeteer;
  });

  it('does not trigger when no Puppeteer artifacts are present', async function () {
    const result = await new PuppeteerDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
    expect(result.type).to.equal('puppeteer');
  });

  it('detects the Puppeteer evaluation script marker', async function () {
    const env = makeEnv({ __puppeteer_evaluation_script__: true });
    const result = await new PuppeteerDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('puppeteer-evaluation-script');
    expect(result.indicators).to.include('global-__puppeteer_evaluation_script__');
  });

  it('detects injected Puppeteer globals', async function () {
    const env = makeEnv({ __puppeteer: {}, puppeteer: {} });
    const result = await new PuppeteerDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('global-__puppeteer');
    expect(result.indicators).to.include('global-puppeteer');
  });

  it('detects additional __puppeteer-prefixed globals', async function () {
    const env = makeEnv({ __puppeteer_custom_hook: true });
    const result = await new PuppeteerDetector(env).detect();

    expect(result.indicators).to.include('global-__puppeteer_custom_hook');
  });

  it('detects puppeteer in eval.toString()', async function () {
    const env = makeEnv({
      eval: Object.assign(() => {}, {
        toString: () => 'function eval() { /* puppeteer */ }',
      }),
    });
    const result = await new PuppeteerDetector(env).detect();

    expect(result.indicators).to.include('eval-puppeteer');
  });

  it('ignores eval.toString() errors', async function () {
    const env = makeEnv({
      eval: Object.assign(() => {}, {
        toString: () => {
          throw new Error('eval probe failed');
        },
      }),
    });
    const result = await new PuppeteerDetector(env).detect();

    expect(result.indicators).to.not.include('eval-puppeteer');
    expect(result.triggered).to.equal(false);
  });
});

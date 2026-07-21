import { expect } from 'chai';
import PuppeteerDetector from '../../../../src/bot/detectors/automation/puppeteer-detector.ts';
import { makeEnv } from '../detector-test.utils.mjs';

describe('PuppeteerDetector', function () {
  it('exposes detector metadata', async function () {
    const detector = new PuppeteerDetector(makeEnv());
    const result = await detector.detect();

    expect(detector.signal).to.equal('puppeteer');
    expect(result.signal).to.equal('puppeteer');
  });

  it('does not trigger when no Puppeteer artifacts are present', async function () {
    const result = await new PuppeteerDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
  });

  it('detects known Puppeteer globals', async function () {
    const env = makeEnv({
      __puppeteer_evaluation_script__: {},
    });
    const result = await new PuppeteerDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('global-__puppeteer_evaluation_script__');
  });

  it('detects the Puppeteer sourceURL marker in eval.toString()', async function () {
    const env = makeEnv({
      eval: Object.assign(() => {}, {
        toString: () => 'function eval() { /*# sourceURL=__puppeteer_evaluation_script__ */ }',
      }),
    });
    const result = await new PuppeteerDetector(env).detect();

    expect(result.indicators).to.include('eval-puppeteer-marker');
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

    expect(result.indicators).to.not.include('eval-puppeteer-marker');
    expect(result.triggered).to.equal(false);
  });

  it('detects a Puppeteer user-agent from the injected environment', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Puppeteer',
        languages: ['en'],
      },
    });
    const result = await new PuppeteerDetector(env).detect();

    expect(result.indicators).to.include('puppeteer-user-agent');
    expect(result.triggered).to.equal(true);
  });
});

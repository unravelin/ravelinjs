import { expect } from 'chai';
import ChromedpDetector from '../../../../src/bot/detectors/automation/chromedp-detector.ts';

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

describe('ChromedpDetector', function () {
  it('does not trigger when no chromedp artifacts are present', async function () {
    const result = await new ChromedpDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
    expect(result.type).to.equal('chromeDP');
    expect(result.precedence).to.equal(10);
  });

  it('detects chromedp-named globals on the environment', async function () {
    const env = makeEnv({ __chromedp_hook: true });
    const result = await new ChromedpDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('global-__chromedp_hook');
  });

  it('detects chromedp-named properties on document', async function () {
    const env = makeEnv({
      document: { chromedpMarker: true },
    });
    const result = await new ChromedpDetector(env).detect();

    expect(result.indicators).to.include('document-chromedpMarker');
  });

  it('detects chromedp in eval.toString()', async function () {
    const env = makeEnv({
      eval: Object.assign(() => {}, {
        toString: () => 'function eval() { /* chromedp */ }',
      }),
    });
    const result = await new ChromedpDetector(env).detect();

    expect(result.indicators).to.include('eval-chromedp-marker');
  });

  it('ignores eval.toString() errors', async function () {
    const env = makeEnv({
      eval: Object.assign(() => {}, {
        toString: () => {
          throw new Error('eval probe failed');
        },
      }),
    });
    const result = await new ChromedpDetector(env).detect();

    expect(result.indicators).to.not.include('eval-chromedp-marker');
    expect(result.triggered).to.equal(false);
  });

  it('detects chromedp in the user agent', async function () {
    const env = makeEnv({
      navigator: { userAgent: 'Mozilla/5.0 Chrome/120 chromedp/0.9' },
    });
    const result = await new ChromedpDetector(env).detect();

    expect(result.indicators).to.include('chromedp-user-agent');
  });
});

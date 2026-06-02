import { expect } from 'chai';
import SlimerJSDetector from '../../../../src/bot/detectors/automation/slimerjs-detector.ts';

/**
 * @param {Record<string, unknown>} [overrides]
 * @returns {detection.Environment}
 */
function makeEnv(overrides = {}) {
  return {
    navigator: {
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64; rv:59.0) Gecko/20100101 Firefox/59.0',
    },
    ...overrides,
  };
}

describe('SlimerJSDetector', function () {
  beforeEach(function () {
    delete globalThis.slimer;
    delete globalThis.__slimer_hook;
  });

  afterEach(function () {
    delete globalThis.slimer;
    delete globalThis.__slimer_hook;
  });

  it('does not trigger when no SlimerJS artifacts are present', async function () {
    const result = await new SlimerJSDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
    expect(result.type).to.equal('slimerJS');
    expect(result.category).to.equal('automation');
  });

  it('detects the slimer global', async function () {
    const env = makeEnv({ slimer: { version: '1.0.0' } });
    const result = await new SlimerJSDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('slimer-global');
  });

  it('detects __slimer-prefixed globals', async function () {
    const env = makeEnv({ __slimer_hook: true });
    const result = await new SlimerJSDetector(env).detect();

    expect(result.indicators).to.include('global-__slimer_hook');
  });

  it('detects SlimerJS in the user agent', async function () {
    const env = makeEnv({
      navigator: {
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64; rv:59.0) Gecko/20100101 Firefox/59.0 SlimerJS/1.0.0',
      },
    });
    const result = await new SlimerJSDetector(env).detect();

    expect(result.indicators).to.include('slimerjs-user-agent');
  });

  it('detects slimerjs in eval.toString()', async function () {
    const env = makeEnv({
      eval: Object.assign(() => {}, {
        toString: () => 'function eval() { /* slimerjs */ }',
      }),
    });
    const result = await new SlimerJSDetector(env).detect();

    expect(result.indicators).to.include('eval-slimerjs-marker');
  });

  it('ignores eval.toString() errors', async function () {
    const env = makeEnv({
      eval: Object.assign(() => {}, {
        toString: () => {
          throw new Error('eval probe failed');
        },
      }),
    });
    const result = await new SlimerJSDetector(env).detect();

    expect(result.indicators).to.not.include('eval-slimerjs-marker');
    expect(result.triggered).to.equal(false);
  });
});

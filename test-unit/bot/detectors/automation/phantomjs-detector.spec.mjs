import { expect } from 'chai';
import PhantomJSDetector from '../../../../src/bot/detectors/automation/phantomjs-detector.ts';

/**
 * @param {Record<string, unknown>} [overrides]
 * @returns {detection.Environment}
 */
function makeEnv(overrides = {}) {
  return {
    navigator: {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    ...overrides,
  };
}

describe('PhantomJSDetector', function () {
  beforeEach(function () {
    delete globalThis.callPhantom;
    delete globalThis._phantom;
    delete globalThis.phantom;
  });

  afterEach(function () {
    delete globalThis.callPhantom;
    delete globalThis._phantom;
    delete globalThis.phantom;
  });

  it('does not trigger when no PhantomJS artifacts are present', async function () {
    const result = await new PhantomJSDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
    expect(result.type).to.equal('phantomJS');
    expect(result.category).to.equal('automation');
  });

  it('detects callPhantom', async function () {
    const env = makeEnv({ callPhantom: () => {} });
    const result = await new PhantomJSDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('callPhantom');
  });

  it('detects _phantom', async function () {
    const env = makeEnv({ _phantom: {} });
    const result = await new PhantomJSDetector(env).detect();

    expect(result.indicators).to.include('_phantom');
  });

  it('detects phantom global', async function () {
    const env = makeEnv({ phantom: {} });
    const result = await new PhantomJSDetector(env).detect();

    expect(result.indicators).to.include('phantom-global');
  });

  it('detects PhantomJS in the user agent', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/538.1 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/538.1',
      },
    });
    const result = await new PhantomJSDetector(env).detect();

    expect(result.indicators).to.include('phantomjs-user-agent');
  });
});

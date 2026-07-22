import { expect } from 'chai';
import PhantomJSDetector from '../../../../src/bot/detectors/automation/phantomjs-detector.ts';
import { makeEnv } from '../detector-test.utils.mjs';

describe('PhantomJSDetector', function () {
  it('exposes detector metadata', async function () {
    const detector = new PhantomJSDetector(makeEnv());
    const result = await detector.detect();

    expect(detector.signal).to.equal('phantomjs');
    expect(result.signal).to.equal('phantomjs');
  });

  it('does not trigger when no PhantomJS artifacts are present', async function () {
    const result = await new PhantomJSDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
  });

  it('detects PhantomJS bridge globals', async function () {
    const env = makeEnv({
      callPhantom: () => {},
      _phantom: {},
    });
    const result = await new PhantomJSDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('global-callPhantom');
    expect(result.indicators).to.include('global-_phantom');
  });

  it('detects a PhantomJS user-agent from the injected environment', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 (Unknown) AppleWebKit/534.34 PhantomJS/2.1.1 Safari/534.34',
        languages: ['en'],
      },
    });
    const result = await new PhantomJSDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('phantomjs-user-agent');
  });
});

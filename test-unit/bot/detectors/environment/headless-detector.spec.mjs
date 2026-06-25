import { expect } from 'chai';
import HeadlessDetector from '../../../../src/bot/detectors/environment/headless-detector.ts';
import { makeEnv } from './detector-test.utils.mjs';

describe('HeadlessDetector', function () {
  it('exposes detector metadata', async function () {
    const detector = new HeadlessDetector(makeEnv());
    const result = await detector.detect();

    expect(detector.signal).to.equal('headless');
    expect(result.signal).to.equal('headless');
  });

  it('does not trigger when no headless artifacts are present', async function () {
    const result = await new HeadlessDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
  });

  it('detects zero outer window dimensions', async function () {
    const env = makeEnv({ outerWidth: 0, outerHeight: 0 });
    const result = await new HeadlessDetector(env).detect();

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
    const result = await new HeadlessDetector(env).detect();

    expect(result.indicators).to.include('headless-app-version');
  });

  it('detects HeadlessChrome in the user agent', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 HeadlessChrome/120.0.0.0',
        plugins: { length: 1 },
        languages: ['en'],
      },
    });
    const result = await new HeadlessDetector(env).detect();

    expect(result.indicators).to.include('headless-chrome-user-agent');
  });

  it('detects empty navigator.languages', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Safari/605.1.15',
        languages: [],
      },
    });
    const result = await new HeadlessDetector(env).detect();

    expect(result.indicators).to.include('empty-languages');
  });
});

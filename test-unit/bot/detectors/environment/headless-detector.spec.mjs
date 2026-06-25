import { expect } from 'chai';
import HeadlessDetector from '../../../../src/bot/detectors/environment/headless-detector.ts';
import { makeEnv } from './detector-test.utils.mjs';

describe('HeadlessDetector', function () {
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

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('no-languages');
  });

  it('detects empty navigator.plugins', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Safari/605.1.15',
        plugins: { length: 0 },
        languages: ['en'],
      },
    });
    const result = await new HeadlessDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('no-plugins');
  });

  it('does not trigger when only one outer dimension is zero', async function () {
    const env = makeEnv({ outerWidth: 0, outerHeight: 1080 });
    const result = await new HeadlessDetector(env).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.not.include('zero-outer-dimensions');
  });

  it('reports multiple indicators when several headless artifacts are present', async function () {
    const env = makeEnv({
      outerWidth: 0,
      outerHeight: 0,
      navigator: {
        userAgent: 'Mozilla/5.0 HeadlessChrome/120.0.0.0',
        appVersion: '5.0 (headless)',
        plugins: { length: 0 },
        languages: [],
      },
    });
    const result = await new HeadlessDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include.members([
      'zero-outer-dimensions',
      'headless-app-version',
      'headless-chrome-user-agent',
      'no-languages',
      'no-plugins',
    ]);
  });
});

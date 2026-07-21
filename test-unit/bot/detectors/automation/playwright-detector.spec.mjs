import { expect } from 'chai';
import PlaywrightDetector from '../../../../src/bot/detectors/automation/playwright-detector.ts';
import { makeEnv } from '../detector-test.utils.mjs';

describe('PlaywrightDetector', function () {
  it('does not trigger when no Playwright artifacts are present', async function () {
    const result = await new PlaywrightDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
    expect(result.signal).to.equal('playwright');
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

  it('detects Playwright geolocation mock', async function () {
    const env = makeEnv({ __pw_geolocation__: { latitude: 51.5, longitude: -0.1 } });
    const result = await new PlaywrightDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('global-__pw_geolocation__');
  });

  it('detects Playwright permissions override', async function () {
    const env = makeEnv({ __pw_permissions__: ['geolocation'] });
    const result = await new PlaywrightDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('global-__pw_permissions__');
  });

  it('detects Playwright timezone mock', async function () {
    const env = makeEnv({ __pw_timezone__: 'Europe/London' });
    const result = await new PlaywrightDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('global-__pw_timezone__');
  });

  it('detects Playwright CDP session artifact', async function () {
    const env = makeEnv({ __cdpSession__: {} });
    const result = await new PlaywrightDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('global-__cdpSession__');
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

  it('detects a Playwright user-agent from the injected environment', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Playwright/1.40',
        languages: ['en'],
      },
    });
    const result = await new PlaywrightDetector(env).detect();

    expect(result.indicators).to.include('playwright-user-agent');
    expect(result.triggered).to.equal(true);
  });
});

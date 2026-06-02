import { expect } from 'chai';
import SeleniumDetector from '../../../../src/bot/detectors/automation/selenium-detector.ts';

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

describe('SeleniumDetector', function () {
  it('does not trigger when no Selenium artifacts are present', async function () {
    const result = await new SeleniumDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
    expect(result.type).to.equal('selenium');
    expect(result.category).to.equal('automation');
  });

  it('detects injected globals on the environment', async function () {
    const env = makeEnv({ __selenium_evaluate: true, __webdriver_evaluate: true });
    const result = await new SeleniumDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('global-__selenium_evaluate');
    expect(result.indicators).to.include('global-__webdriver_evaluate');
  });

  it('detects injected globals on document', async function () {
    const env = makeEnv({
      document: { __webdriver_script_func: true },
    });
    const result = await new SeleniumDetector(env).detect();

    expect(result.indicators).to.include('document-__webdriver_script_func');
  });

  it('detects Selenium / ChromeDriver in the user agent', async function () {
    const env = makeEnv({
      navigator: { userAgent: 'Mozilla/5.0 Chrome/120 ChromeDriver/120.0.0.0' },
    });
    const result = await new SeleniumDetector(env).detect();

    expect(result.indicators).to.include('selenium-chrome-driver-user-agent');
  });

  it('detects selenium substring in the user agent', async function () {
    const env = makeEnv({
      navigator: { userAgent: 'Mozilla/5.0 (compatible; selenium/4.0)' },
    });
    const result = await new SeleniumDetector(env).detect();

    expect(result.indicators).to.include('selenium-chrome-driver-user-agent');
  });
});

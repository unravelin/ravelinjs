import { expect } from 'chai';
import SeleniumDetector from '../../../../src/bot/detectors/automation/selenium-detector.ts';
import { makeEnv } from '../detector-test.utils.mjs';

describe('SeleniumDetector', function () {
  it('exposes detector metadata', async function () {
    const detector = new SeleniumDetector(makeEnv());
    const result = await detector.detect();

    expect(detector.signal).to.equal('selenium');
    expect(result.signal).to.equal('selenium');
  });

  it('does not trigger when no Selenium artifacts are present', async function () {
    const result = await new SeleniumDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
  });

  it('detects Selenium/WebDriver window globals', async function () {
    const env = makeEnv({
      __selenium_unwrapped: {},
      __webdriver_evaluate: () => {},
    });
    const result = await new SeleniumDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('global-__selenium_unwrapped');
    expect(result.indicators).to.include('global-__webdriver_evaluate');
  });

  it('detects Selenium properties leaked onto the document', async function () {
    const env = makeEnv({
      document: {
        __webdriver_script_fn: () => {},
        'webdriver-evaluate': true,
      },
    });
    const result = await new SeleniumDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('document-__webdriver_script_fn');
    expect(result.indicators).to.include('document-webdriver-evaluate');
  });

  it('detects randomly-named ChromeDriver keys on the document', async function () {
    const env = makeEnv({
      document: {
        $cdc_asdjflasutopfhvcZLmcfl_Array: [],
      },
    });
    const result = await new SeleniumDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('chromedriver-$cdc_asdjflasutopfhvcZLmcfl_Array');
  });

  it('detects ChromeDriver keys on the window', async function () {
    const env = makeEnv({
      cdc_adoQpoasnfa76pfcZLmcfl_Symbol: {},
    });
    const result = await new SeleniumDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('chromedriver-cdc_adoQpoasnfa76pfcZLmcfl_Symbol');
  });

  it('does not report the same ChromeDriver key twice', async function () {
    const env = makeEnv({
      $cdc_shared_Array: {},
      document: {
        $cdc_shared_Array: {},
      },
    });
    const result = await new SeleniumDetector(env).detect();

    const matches = result.indicators.filter(
      indicator => indicator === 'chromedriver-$cdc_shared_Array'
    );
    expect(matches).to.have.lengthOf(1);
  });

  it('detects a Selenium user-agent from the injected environment', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 selenium',
        languages: ['en'],
      },
    });
    const result = await new SeleniumDetector(env).detect();

    expect(result.indicators).to.include('selenium-user-agent');
    expect(result.triggered).to.equal(true);
  });
});

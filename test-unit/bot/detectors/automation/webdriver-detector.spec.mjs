import { expect } from 'chai';
import WebdriverDetector from '../../../../src/bot/detectors/environment/webdriver-detector.ts';
import { makeEnv } from '../detector-test.utils.mjs';

describe('WebdriverDetector', function () {
  it('exposes detector metadata', async function () {
    const detector = new WebdriverDetector(makeEnv());
    const result = await detector.detect();

    expect(detector.signal).to.equal('webdriver');
    expect(result.signal).to.equal('webdriver');
  });

  it('does not trigger when no webdriver artifacts are present', async function () {
    const result = await new WebdriverDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
  });

  it('detects navigator.webdriver', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Safari/605.1.15',
        webdriver: true,
        languages: ['en'],
      },
    });
    const result = await new WebdriverDetector(env).detect();

    expect(result.indicators).to.include('navigator-webdriver');
  });

  it('detects document webdriver attribute', async function () {
    const env = makeEnv({
      document: {
        documentElement: {
          hasAttribute: name => name === 'webdriver',
        },
      },
    });
    const result = await new WebdriverDetector(env).detect();

    expect(result.indicators).to.include('document-element-webdriver-attr');
  });
});

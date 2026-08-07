import { expect } from 'chai';
import ChromeDriverDetector from '../../../../src/bot/detectors/automation/chromedriver-detector.ts';
import { getIds } from '../../../../src/bot/detectors/utils.ts';
import { makeEnv } from '../detector-test.utils.mjs';

describe('ChromeDriverDetector', function () {
  it('does not trigger when no ChromeDriver artifacts are present', async function () {
    const result = await new ChromeDriverDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
  });

  it('detects the $chrome_asyncScriptInfo document global', async function () {
    const env = makeEnv({
      document: {
        $chrome_asyncScriptInfo: {},
      },
    });
    const result = await new ChromeDriverDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(getIds(result.indicators)).to.include('global-$chrome_asyncScriptInfo');
  });

  it('detects randomly-named ChromeDriver keys on the document', async function () {
    const env = makeEnv({
      document: {
        $cdc_asdjflasutopfhvcZLmcfl_Array: [],
      },
    });
    const result = await new ChromeDriverDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(getIds(result.indicators)).to.include('injected-key-$cdc_asdjflasutopfhvcZLmcfl_Array');
  });

  it('detects ChromeDriver keys on the window', async function () {
    const env = makeEnv({
      cdc_adoQpoasnfa76pfcZLmcfl_Symbol: {},
    });
    const result = await new ChromeDriverDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(getIds(result.indicators)).to.include('injected-key-cdc_adoQpoasnfa76pfcZLmcfl_Symbol');
  });

  it('does not report the same injected key twice', async function () {
    const env = makeEnv({
      $cdc_shared_Array: {},
      document: {
        $cdc_shared_Array: {},
      },
    });
    const result = await new ChromeDriverDetector(env).detect();

    const matches = getIds(result.indicators).filter(id => id === 'injected-key-$cdc_shared_Array');
    expect(matches).to.have.lengthOf(1);
  });
});

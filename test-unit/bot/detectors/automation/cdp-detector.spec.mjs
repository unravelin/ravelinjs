import { expect } from 'chai';
import CDPDetector from '../../../../src/bot/detectors/automation/cdp-detector.ts';
import { makeEnv } from '../detector-test.utils.mjs';

describe('CDPDetector', function () {
  it('does not trigger when no console is available', async function () {
    const result = await new CDPDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
  });

  it('does not trigger when the console does not serialize its argument', async function () {
    const env = makeEnv({
      console: {
        debug() {
          // A console with no CDP client attached never reads the argument.
        },
      },
    });
    const result = await new CDPDetector(env).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.not.include('console-serialization');
  });

  it('triggers when the console serializes the error stack (CDP attached)', async function () {
    const env = makeEnv({
      console: {
        debug(arg) {
          // Emulate a CDP client serializing the argument, which reads `.stack`.
          void arg.stack;
        },
      },
    });
    const result = await new CDPDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('console-serialization');
  });

  it('falls back to console.log when debug is unavailable', async function () {
    const env = makeEnv({
      console: {
        log(arg) {
          void arg.stack;
        },
      },
    });
    const result = await new CDPDetector(env).detect();

    expect(result.indicators).to.include('console-serialization');
  });

  it('treats a throwing console as inconclusive', async function () {
    const env = makeEnv({
      console: {
        debug() {
          throw new Error('console probe failed');
        },
      },
    });
    const result = await new CDPDetector(env).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.not.include('console-serialization');
  });
});

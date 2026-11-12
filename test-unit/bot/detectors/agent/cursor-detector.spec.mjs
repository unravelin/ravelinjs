import { expect } from 'chai';
import CursorDetector from '../../../../src/bot/detectors/agent/cursor-detector.ts';
import { getIds, makeEnv } from '../detector-test.utils.mjs';

const CURSOR_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/3.23.23 Chrome/148.0.7778.280 Electron/42.10.0 Safari/537.36';

describe('CursorDetector', function () {
  it('does not trigger in a normal browser', async function () {
    const result = await new CursorDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
  });

  it('detects the Cursor embedded-browser user agent', async function () {
    const env = makeEnv({
      navigator: { userAgent: CURSOR_USER_AGENT },
    });
    const result = await new CursorDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(getIds(result.indicators)).to.deep.equal(['cursor-user-agent']);
  });

  it('does not treat Electron or Cursor alone as the embedded browser', async function () {
    const electron = await new CursorDetector(
      makeEnv({
        navigator: {
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Electron/42.10.0 Safari/537.36',
        },
      })
    ).detect();
    const cursorOnly = await new CursorDetector(
      makeEnv({
        navigator: { userAgent: 'Mozilla/5.0 Cursor/3.23.23 Safari/537.36' },
      })
    ).detect();

    expect(electron.triggered).to.equal(false);
    expect(cursorOnly.triggered).to.equal(false);
  });

  it('detects injected Cursor globals', async function () {
    const env = makeEnv({
      __cursorDevToolsInjected: true,
      __cursorDialogConfig: {},
      cursorPasskey: { notify() {} },
    });
    const result = await new CursorDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(getIds(result.indicators)).to.deep.equal([
      'global-__cursorDevToolsInjected',
      'global-__cursorDialogConfig',
      'global-cursorPasskey',
    ]);
  });
});

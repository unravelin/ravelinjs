import { expect } from 'chai';
import ElectronDetector from '../../../../src/bot/detectors/automation/electron-detector.ts';

/**
 * @param {Record<string, unknown>} [overrides]
 * @returns {detection.Environment}
 */
function makeEnv(overrides = {}) {
  return {
    navigator: {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    ...overrides,
  };
}

describe('ElectronDetector', function () {
  beforeEach(function () {
    delete globalThis.electron;
    delete globalThis.__electron_hook;
  });

  afterEach(function () {
    delete globalThis.electron;
    delete globalThis.__electron_hook;
  });

  it('does not trigger when no Electron artifacts are present', async function () {
    const result = await new ElectronDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
    expect(result.type).to.equal('electron');
  });

  it('detects Electron in the user agent', async function () {
    const env = makeEnv({
      navigator: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Electron/28.0.0 Safari/537.36',
      },
    });
    const result = await new ElectronDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('electron-user-agent');
  });

  it('detects Electron in navigator.appVersion', async function () {
    const env = makeEnv({
      navigator: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        appVersion:
          '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Electron/28.0.0 Safari/537.36',
      },
    });
    const result = await new ElectronDetector(env).detect();

    expect(result.indicators).to.include('electron-app-version');
  });

  it('detects process.versions.electron', async function () {
    const env = makeEnv({
      process: { versions: { electron: '28.0.0' } },
    });
    const result = await new ElectronDetector(env).detect();

    expect(result.indicators).to.include('process-versions-electron');
  });

  it('detects renderer process with electron version', async function () {
    const env = makeEnv({
      process: { type: 'renderer', versions: { electron: '28.0.0' } },
    });
    const result = await new ElectronDetector(env).detect();

    expect(result.indicators).to.include('process-renderer-electron');
  });

  it('does not flag renderer process without electron version', async function () {
    const env = makeEnv({
      process: { type: 'renderer', versions: {} },
    });
    const result = await new ElectronDetector(env).detect();

    expect(result.indicators).to.not.include('process-renderer-electron');
    expect(result.triggered).to.equal(false);
  });

  it('detects the electron global', async function () {
    const env = makeEnv({ electron: { ipcRenderer: {} } });
    const result = await new ElectronDetector(env).detect();

    expect(result.indicators).to.include('electron-global');
  });

  it('detects __electron-prefixed globals', async function () {
    const env = makeEnv({ __electron_hook: true });
    const result = await new ElectronDetector(env).detect();

    expect(result.indicators).to.include('global-__electron_hook');
  });

  it('detects electron in eval.toString()', async function () {
    const env = makeEnv({
      eval: Object.assign(() => {}, {
        toString: () => 'function eval() { /* electron */ }',
      }),
    });
    const result = await new ElectronDetector(env).detect();

    expect(result.indicators).to.include('eval-electron-marker');
  });

  it('ignores eval.toString() errors', async function () {
    const env = makeEnv({
      eval: Object.assign(() => {}, {
        toString: () => {
          throw new Error('eval probe failed');
        },
      }),
    });
    const result = await new ElectronDetector(env).detect();

    expect(result.indicators).to.not.include('eval-electron-marker');
    expect(result.triggered).to.equal(false);
  });
});

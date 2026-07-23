import { expect } from 'chai';
import PermissionsDetector from '../../../../src/bot/detectors/environment/permissions-detector.ts';
import { makeEnv } from '../detector-test.utils.mjs';

describe('PermissionsDetector', function () {
  it('does not trigger when the Permissions API is unavailable', async function () {
    const result = await new PermissionsDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
  });

  it('detects the Notification permission inconsistency', async function () {
    const env = makeEnv({
      Notification: { permission: 'denied' },
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
        permissions: {
          query: async ({ name }) => ({
            state: name === 'notifications' ? 'prompt' : 'denied',
          }),
        },
      },
    });
    const result = await new PermissionsDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(result.indicators).to.include('permission-mismatch');
  });

  it('does not flag consistent notification permissions', async function () {
    const env = makeEnv({
      Notification: { permission: 'default' },
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
        permissions: {
          query: async () => ({ state: 'prompt' }),
        },
      },
    });
    const result = await new PermissionsDetector(env).detect();

    expect(result.indicators).to.not.include('permission-mismatch');
  });

  it('ignores permission query failures', async function () {
    const env = makeEnv({
      Notification: { permission: 'denied' },
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
        permissions: {
          query: async () => {
            throw new Error('unsupported');
          },
        },
      },
    });
    const result = await new PermissionsDetector(env).detect();

    expect(result.triggered).to.equal(false);
  });
});

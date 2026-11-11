import { expect } from 'chai';
import MuseDetector from '../../../../src/bot/detectors/agent/muse-detector.ts';
import { getIds, makeEnv } from '../detector-test.utils.mjs';

/** A property descriptor matching 1Password's patched-accessor shape. */
function patchedAccessor() {
  return {
    get() {},
    set() {},
    configurable: false,
    enumerable: true,
  };
}

/** The five credential methods as own, 1Password-shaped accessors. */
function passwordManagerCredentials() {
  const container = {};
  Object.defineProperty(container, 'get', patchedAccessor());
  Object.defineProperty(container, 'create', patchedAccessor());

  const PublicKeyCredential = {};
  for (const name of [
    'getClientCapabilities',
    'isUserVerifyingPlatformAuthenticatorAvailable',
    'isConditionalMediationAvailable',
  ]) {
    Object.defineProperty(PublicKeyCredential, name, patchedAccessor());
  }
  return { container, PublicKeyCredential };
}

/** A document whose canvas reports the given WebGL renderer string. */
function webglDocument(renderer) {
  return {
    createElement: () => ({
      getContext: () => ({
        getExtension: name =>
          name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : null,
        getParameter: () => renderer,
      }),
    }),
  };
}

/** A full Muse-shaped environment; pass overrides to break one clause. */
function museEnv(overrides = {}) {
  const { container, PublicKeyCredential } = passwordManagerCredentials();
  return makeEnv({
    navigator: {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0.0.0',
      platform: 'Linux x86_64',
      languages: ['en'],
      credentials: container,
    },
    PublicKeyCredential,
    document: webglDocument('Google SwiftShader'),
    ...overrides,
  });
}

describe('MuseDetector', function () {
  it('triggers when all three clauses hold', async function () {
    const result = await new MuseDetector(museEnv()).detect();

    expect(result.triggered).to.equal(true);
    expect(getIds(result.indicators)).to.deep.equal(['muse-cloud-browser-password-manager']);
  });

  it('does not trigger for a 1Password user on a normal GPU laptop', async function () {
    // Password-manager credentials present, but hardware renderer and Mac host.
    const result = await new MuseDetector(
      museEnv({
        navigator: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/140.0.0.0',
          platform: 'MacIntel',
          languages: ['en'],
          credentials: passwordManagerCredentials().container,
        },
        document: webglDocument('ANGLE (Apple, Apple M1, OpenGL)'),
      })
    ).detect();

    expect(result.triggered).to.equal(false);
  });

  it('does not trigger for a cloud host without the password-manager credentials', async function () {
    const result = await new MuseDetector(
      museEnv({
        navigator: {
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0.0.0',
          platform: 'Linux x86_64',
          languages: ['en'],
          credentials: {}, // no patched accessors
        },
        PublicKeyCredential: {},
      })
    ).detect();

    expect(result.triggered).to.equal(false);
  });

  it('does not trigger below the Chrome 139 cloud-host cutoff', async function () {
    const result = await new MuseDetector(
      museEnv({
        navigator: {
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/138.0.0.0',
          platform: 'Linux x86_64',
          languages: ['en'],
          credentials: passwordManagerCredentials().container,
        },
      })
    ).detect();

    expect(result.triggered).to.equal(false);
  });

  it('does not trigger with a hardware renderer', async function () {
    const result = await new MuseDetector(
      museEnv({ document: webglDocument('ANGLE (NVIDIA GeForce RTX 3080)') })
    ).detect();

    expect(result.triggered).to.equal(false);
  });
});

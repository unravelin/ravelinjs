/**
 * @fileoverview Detects Meta's "Muse" cloud computer-use agent. Muse has no
 * self-identifying user agent and injects no global; it is recognised by the
 * shape of its cloud browser. Three independent clauses must all hold, and only
 * together — no single clause is reported on its own:
 *
 *   1. The 1Password credential fingerprint — all five credential/WebAuthn
 *      methods replaced by own, enumerable, non-configurable accessors with both
 *      a getter and a setter. 1Password does this on every page and Muse's cloud
 *      browser ships it; this clause ALONE is "a 1Password user", not Muse.
 *   2. The cloud host — `navigator.platform === 'Linux x86_64'` and Chrome 139+,
 *      where stock Chrome no longer renders in software without a flag/policy, so
 *      a person's own Chrome rarely renders in software.
 *   3. A software (SwiftShader) WebGL renderer — a GPU-less cloud machine.
 *
 */

import { readUnmaskedRenderer } from '../utils';

/** Minimum Chrome major version for the cloud host (see clause 2). */
const CHROME_CLOUD_MIN = 139;

/** The five credential methods 1Password replaces, as `[owner, name]` pairs. */
type CredentialMethod = [owner: unknown, name: string];

/**
 * Detects Meta's Muse cloud computer-use agent by its cloud-browser shape.
 */
export default class MuseDetector implements detection.Detector {
  public readonly signal = 'muse';
  public readonly category = 'agent';
  // Between Cursor (25) and Claude (30): a specific agent surface that should
  // own the primary label over the generic headless/webdriver signals.
  public readonly precedence = 28;

  public triggered = false;
  public indicators: detection.Indicator[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    if (
      this._hasPasswordManagerCredentials() &&
      this._isCloudHost() &&
      this._isSoftwareRenderer()
    ) {
      // The full conjunction is specific to Muse's cloud browser; above the
      // agent-verdict threshold (90) so detecting Muse yields an `agent` verdict.
      this.indicators.push({ id: 'muse-cloud-browser-password-manager', confidence: 95 });
    }

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      category: this.category,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }

  /**
   * Clause 1: all five credential methods carry 1Password's signature — an own,
   * enumerable, non-configurable accessor with both a getter and a setter.
   */
  private _hasPasswordManagerCredentials(): boolean {
    const nav = this.env.navigator;
    const container = nav?.credentials;
    const key = (this.env as detection.Environment & { PublicKeyCredential?: unknown })
      .PublicKeyCredential;
    if (!container || !key) {
      return false;
    }

    const methods: CredentialMethod[] = [
      [container, 'get'],
      [container, 'create'],
      [key, 'getClientCapabilities'],
      [key, 'isUserVerifyingPlatformAuthenticatorAvailable'],
      [key, 'isConditionalMediationAvailable'],
    ];
    return methods.every(([owner, name]) => this._isPatchedAccessor(owner, name));
  }

  /**
   * Whether `name` resolves to an own accessor with the password-manager shape.
   * Mirrors the reference reader: walk up to four prototypes, take the first
   * descriptor found, and require it to be own (depth 0).
   */
  private _isPatchedAccessor(owner: unknown, name: string): boolean {
    let target = owner as object | null;
    for (let depth = 0; target && depth < 4; depth++, target = Object.getPrototypeOf(target)) {
      let descriptor: PropertyDescriptor | undefined;
      try {
        descriptor = Object.getOwnPropertyDescriptor(target, name);
      } catch {
        return false;
      }

      if (descriptor) {
        const accessor = !('value' in descriptor);
        return (
          depth === 0 &&
          accessor &&
          descriptor.configurable === false &&
          descriptor.enumerable === true &&
          typeof descriptor.get === 'function' &&
          typeof descriptor.set === 'function'
        );
      }
    }

    return false;
  }

  /** Clause 2: a Linux x86_64 host running Chrome 139 or later. */
  private _isCloudHost(): boolean {
    const nav = this.env.navigator || ({} as Navigator);
    const platform = nav.platform || '';
    const userAgent = nav.userAgent || '';
    const chromeMajor = Number(/\bChrome\/(\d+)/.exec(userAgent)?.[1] ?? 0);
    return platform === 'Linux x86_64' && chromeMajor >= CHROME_CLOUD_MIN;
  }

  /** Clause 3: WebGL renders in software via SwiftShader (no GPU). */
  private _isSoftwareRenderer(): boolean {
    const renderer = readUnmaskedRenderer(this.env);
    return !!renderer && renderer.includes('SwiftShader');
  }
}

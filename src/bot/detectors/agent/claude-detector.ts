/**
 * @fileoverview Detects Claude (Anthropic) agents across the surfaces they use
 * to reach a page:
 *
 *   #3 Self-identifying user agents — Anthropic's documented fetch/crawl tokens
 *      (`ClaudeBot`, `Claude-User`, …) and any Claude/Anthropic brand reported
 *      via `navigator.userAgentData`.
 *   #4 The "Claude for Chrome" extension — artifacts its content scripts inject
 *      into the page. The exact names are still to be confirmed against the
 *      shipping extension, so the mechanism is in place but the fixed-name list
 *      is intentionally empty for now (see CLAUDE_GLOBALS).
 *
 * The Computer Use reference container is a generic VM/sandbox fingerprint
 * shared by many agent frameworks rather than a Claude artifact, so it lives in
 * the headless (environment) detector, not here.
 */

/**
 * Anthropic's published, self-identifying user-agent tokens. Mostly server-side
 * fetch/crawl clients that do not run page JS, but `Claude-User` (a user-asked
 * URL fetch) can surface in contexts where this code executes, so matching them
 * is cheap and unambiguous.
 */
const CLAUDE_USER_AGENT_PATTERN =
  /\b(?:ClaudeBot|Claude-User|Claude-Web|Claude-SearchBot|anthropic-ai)\b/i;

/** Brand substrings we treat as a Claude/Anthropic `userAgentData` brand. */
const CLAUDE_BRAND_PATTERN = /anthropic|claude/i;

/**
 * Fixed-name globals the "Claude for Chrome" extension injects onto `window`.
 * TODO: confirm the real names against the shipping extension before relying on
 * these; left empty so we never fire on a guessed name that a real site uses.
 */
const CLAUDE_GLOBALS: string[] = [];

/**
 * Detects Claude agents via self-identifying user agents and the Claude for
 * Chrome extension.
 */
export default class ClaudeDetector implements detection.Detector {
  public readonly signal = 'claude';
  public readonly category = 'agent';
  // Above Cursor/ChromeDriver (25) so Claude wins the primary label when it
  // co-fires with a generic automation signal.
  public readonly precedence = 30;

  public triggered = false;
  public indicators: detection.Indicator[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    this._detectUserAgent();
    this._detectGlobals();

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      category: this.category,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }

  /** #3 Anthropic's self-identifying UA tokens and `userAgentData` brand. */
  private _detectUserAgent(): void {
    const nav = this.env.navigator || ({} as Navigator);

    const userAgent = nav.userAgent || '';
    if (CLAUDE_USER_AGENT_PATTERN.test(userAgent)) {
      // A published Anthropic product token is a direct, self-declared signal.
      this.indicators.push({ id: 'claude-user-agent', confidence: 90 });
    }

    // userAgentData is harder to spoof than the UA string, but only Chromium
    // populates the brand list; absent elsewhere, so this is best-effort.
    const brands = (nav as Navigator & { userAgentData?: { brands?: Array<{ brand?: string }> } })
      .userAgentData?.brands;
    if (Array.isArray(brands) && brands.some(b => CLAUDE_BRAND_PATTERN.test(b?.brand || ''))) {
      this.indicators.push({ id: 'claude-user-agent-data-brand', confidence: 90 });
    }
  }

  /** #4 Fixed-name globals the Claude for Chrome extension injects. */
  private _detectGlobals(): void {
    for (const global of CLAUDE_GLOBALS) {
      if (global in this.env) {
        // A fixed Claude global is a direct artifact of the extension.
        this.indicators.push({ id: `global-${global}`, confidence: 95 });
      }
    }
  }
}

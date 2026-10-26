import { expect } from 'chai';
import ClaudeDetector from '../../../../src/bot/detectors/agent/claude-detector.ts';
import { getIds, makeEnv } from '../detector-test.utils.mjs';

const CLAUDE_USER_USER_AGENT =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)';

describe('ClaudeDetector', function () {
  it('does not trigger in a normal browser', async function () {
    const result = await new ClaudeDetector(makeEnv()).detect();

    expect(result.triggered).to.equal(false);
    expect(result.indicators).to.deep.equal([]);
  });

  it("detects Anthropic's self-identifying user agent", async function () {
    const env = makeEnv({ navigator: { userAgent: CLAUDE_USER_USER_AGENT } });
    const result = await new ClaudeDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(getIds(result.indicators)).to.deep.equal(['claude-user-agent']);
  });

  it('detects a Claude/Anthropic userAgentData brand', async function () {
    const env = makeEnv({
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
        userAgentData: { brands: [{ brand: 'Chromium' }, { brand: 'Anthropic Claude' }] },
      },
    });
    const result = await new ClaudeDetector(env).detect();

    expect(result.triggered).to.equal(true);
    expect(getIds(result.indicators)).to.deep.equal(['claude-user-agent-data-brand']);
  });
});

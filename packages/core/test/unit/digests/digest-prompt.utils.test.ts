import { describe, expect, it } from 'vitest';

import { buildDigestPrompt } from '@~/features/digests/digest-prompt.utils';

const INPUT = {
  branch: 'feature',
  parentBranch: 'main',
  baseSha: 'a'.repeat(40),
  headSha: 'b'.repeat(40),
  commits: [],
  units: [],
  patch: '',
  isPatchTruncated: false,
};

describe('buildDigestPrompt', () => {
  it("asks the agent to point out units that go against the reviewer's preferences", () => {
    const prompt = buildDigestPrompt({ ...INPUT, preferences: ['Prefer one shared mechanism.'] });

    expect(prompt).toContain("The reviewer's preferences for this repository.");
    expect(prompt).toContain('- Prefer one shared mechanism.\n\nAnswer with:');
  });

  it('leaves the section out when there are none', () => {
    expect(buildDigestPrompt({ ...INPUT, preferences: [] })).not.toContain('preferences');
  });
});

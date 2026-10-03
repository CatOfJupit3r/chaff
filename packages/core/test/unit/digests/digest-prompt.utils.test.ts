import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildDigestPrompt } from '@~/features/digests/digest-prompt.utils';

const DIFF_DIRECTORY = path.join('scratch', 'diff');

const INPUT = {
  diffDirectory: DIFF_DIRECTORY,
  branch: 'feature',
  parentBranch: 'main',
  baseSha: 'a'.repeat(40),
  headSha: 'b'.repeat(40),
  commits: [],
  units: [],
  patch: '',
  outlined: [],
  preferences: [],
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

  it("gives the merge request's description and linked issues as documented intent", () => {
    const prompt = buildDigestPrompt({
      ...INPUT,
      change: {
        title: 'Retry failed deliveries',
        description: 'Closes #12',
        issues: [{ number: 12, title: 'Deliveries are lost on timeouts', description: 'Seen in production.' }],
      },
    });

    expect(prompt).toContain('Title: Retry failed deliveries\nCloses #12');
    expect(prompt).toContain('Issue #12: Deliveries are lost on timeouts\nSeen in production.');
  });

  it('lists the files left out of a large diff with where their diffs are, for the agent to read', () => {
    const prompt = buildDigestPrompt({
      ...INPUT,
      patch: 'diff --git a/src/small.ts b/src/small.ts\n',
      outlined: [{ path: 'src/big.ts', additions: 900, deletions: 4, hunks: ['@@ -1,4 +1,900 @@'] }],
    });

    expect(prompt).toContain('The diff of the files that fit:');
    expect(prompt).toContain(
      `- src/big.ts (+900 -4), diff in ${path.join(DIFF_DIRECTORY, 'src/big.ts.diff')}\n    @@ -1,4 +1,900 @@`,
    );
  });

  it('leaves the diff out of the prompt when no file fits, and points at the saved diffs', () => {
    const prompt = buildDigestPrompt({
      ...INPUT,
      outlined: [{ path: 'src/big.ts', additions: 900, deletions: 4, hunks: ['@@ -1,4 +1,900 @@'] }],
    });

    expect(prompt).not.toContain('```diff');
    expect(prompt).toContain(`the whole branch's as ${path.join(DIFF_DIRECTORY, 'all.diff')}`);
  });
});

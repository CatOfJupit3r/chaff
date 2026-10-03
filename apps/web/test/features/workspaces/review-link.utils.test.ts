import { describe, expect, it } from 'vitest';

import { parseReviewLink } from '@~/features/workspaces/review-link.utils';

describe('reading what was pasted into the start box', () => {
  it('reads a GitLab merge request link in a nested group', () => {
    expect(parseReviewLink(' https://gitlab.acme.dev/acme/payments/ledger/-/merge_requests/414/diffs ')).toEqual({
      project: 'acme/payments/ledger',
      number: 414,
    });
  });

  it('reads a GitHub pull request link', () => {
    expect(parseReviewLink('https://github.com/acme/ledger/pull/12')).toEqual({ project: 'acme/ledger', number: 12 });
  });

  it('reads a bare number on either host', () => {
    expect(parseReviewLink('!414')).toEqual({ number: 414 });
    expect(parseReviewLink('#12')).toEqual({ number: 12 });
  });

  it('treats anything else that could be a ref as a branch name', () => {
    expect(parseReviewLink('feat/retry-scheduler')).toEqual({ branch: 'feat/retry-scheduler' });
  });

  it('rejects text that cannot be a branch or a link', () => {
    expect(parseReviewLink('https://example.com/acme')).toBeUndefined();
    expect(parseReviewLink('two words')).toBeUndefined();
  });
});

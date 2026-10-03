import { describe, expect, it } from 'vitest';

import { issueRefs } from '@~/features/code-hosts/issue-refs.utils';

describe('issueRefs', () => {
  it('reads issue mentions in order, once each, without the change itself, links or headings', () => {
    const description = [
      '## Why',
      'Closes #7 and fixes #12, see #7 again.',
      'Stacked on !3 and #4; also https://example.com/a#5 and group/project#9.',
    ].join('\n');

    expect(issueRefs(description, 4, 3)).toEqual([7, 12]);
    expect(issueRefs(description, 99, 1)).toEqual([7]);
  });
});

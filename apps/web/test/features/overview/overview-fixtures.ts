import type { iRemoteChange } from '@~/features/code-hosts/code-hosts.types';

export function remoteChange(
  number: number,
  sourceBranch: string,
  targetBranch = 'main',
  overrides: Partial<iRemoteChange> = {},
): iRemoteChange {
  return {
    number,
    sourceBranch,
    targetBranch,
    title: `Change ${number}`,
    description: '',
    authorName: 'Reviewer',
    authorUsername: 'reviewer',
    headSha: `${sourceBranch}-sha`,
    webUrl: `https://gitlab.com/group/project/-/merge_requests/${number}`,
    isDraft: false,
    updatedAt: new Date('2026-10-03T10:00:00Z'),
    assigneeUsernames: [],
    reviewerUsernames: [],
    ...overrides,
  };
}

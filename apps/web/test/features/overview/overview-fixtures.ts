import { CODE_HOSTS } from '@chaff/common/enums/code-host.enums';

import type { iInboxProject, iRemoteChange } from '@~/features/code-hosts/code-hosts.types';

import { workspace } from '../workspaces/workspace-fixtures';

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

export function inboxProject(changes: iRemoteChange[], overrides: Partial<iInboxProject> = {}): iInboxProject {
  return {
    workspaceId: workspace.id,
    connectionId: 'connection',
    host: CODE_HOSTS.GITLAB,
    project: 'group/project',
    changes,
    error: null,
    ...overrides,
  };
}

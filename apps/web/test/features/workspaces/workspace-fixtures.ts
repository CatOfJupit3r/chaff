import { DEFAULT_STACK_FILTERS } from '@chaff/common/constants/stack-filters.constants';

import type { iBranch, iWorkspace } from '@~/features/workspaces/workspaces.types';

export const workspace: iWorkspace = {
  id: 'workspace-1',
  name: 'chaff',
  repoPath: '/home/me/chaff',
  defaultBranch: 'main',
  isAvailable: true,
  hiddenStacks: [],
  stackFilters: DEFAULT_STACK_FILTERS,
  createdAt: new Date('2026-09-01T10:00:00Z'),
};

export function branch(name: string, overrides: Partial<iBranch> = {}): iBranch {
  return {
    name,
    headSha: `${name}-sha`,
    subject: `Work on ${name}`,
    authorName: 'Roman',
    committedAt: new Date('2026-09-20T10:00:00Z'),
    isDefault: false,
    parent: 'main',
    commitsAhead: 1,
    isAuthoredByUser: true,
    isParentConfirmed: false,
    isParentMoved: false,
    hasWorkingChanges: false,
    ...overrides,
  };
}

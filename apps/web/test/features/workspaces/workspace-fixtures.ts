import type { iBranch, iWorkspace } from '@~/features/workspaces/workspaces.types';

export const workspace: iWorkspace = {
  id: 'workspace-1',
  name: 'chaff',
  repoPath: '/home/me/chaff',
  defaultBranch: 'main',
  isAvailable: true,
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
    isParentConfirmed: false,
    isParentMoved: false,
    hasWorkingChanges: false,
    ...overrides,
  };
}

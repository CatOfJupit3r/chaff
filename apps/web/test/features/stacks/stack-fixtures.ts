import { CODE_HOSTS } from '@chaff/common/enums/code-host.enums';

import type { iStack, iStackMember } from '@~/features/stacks/stacks.types';

import { workspace } from '../workspaces/workspace-fixtures';

export function stackMember(branch: string, overrides: Partial<iStackMember> = {}): iStackMember {
  return { branch, commitsAhead: 1, isParentMoved: false, isMissing: false, ...overrides };
}

/** A stack of the branches, bottom first, each merging into the one before it and the first into `main`. */
export function builtStack(names: readonly string[], overrides: Partial<iStack> = {}): iStack {
  const baseBranch = 'baseBranch' in overrides ? overrides.baseBranch : 'main';
  return {
    id: `stack-${names.join('-')}`,
    workspaceId: workspace.id,
    baseBranch,
    isHidden: false,
    branches: names.map((name, index) =>
      stackMember(name, { parentBranch: index === 0 ? baseBranch : names[index - 1] }),
    ),
    remote: { host: CODE_HOSTS.GITLAB, project: 'group/project' },
    createdAt: new Date('2026-10-01T10:00:00Z'),
    updatedAt: new Date('2026-10-01T10:00:00Z'),
    ...overrides,
  };
}

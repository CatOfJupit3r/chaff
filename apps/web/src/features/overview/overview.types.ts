import type { iChangeRequestInfo, iRemoteChange } from '@~/features/code-hosts/code-hosts.types';
import type { iReviewTarget } from '@~/features/reviews/reviews.types';
import type { iStack, iStackMember } from '@~/features/stacks/stacks.types';
import type { iBranch, iWorkspace } from '@~/features/workspaces/workspaces.types';

export interface iOverviewBranch {
  name: string;
  title: string;
  /** Branch it merges into in its stack; unset until the stack's base is chosen. */
  parent?: string;
  member: iStackMember;
  local?: iBranch;
  change?: iChangeRequestInfo;
  remote?: iRemoteChange;
  target?: iReviewTarget;
  localTarget?: iReviewTarget;
}

export interface iOverviewStack {
  id: string;
  title: string;
  /** Branch nothing else in the stack builds on. */
  tipBranch: string;
  workspace: iWorkspace;
  base?: string;
  /** Bottom first. */
  branches: iOverviewBranch[];
  isHidden: boolean;
  stack: iStack;
}

export type iStackFilters = iWorkspace['stackFilters'];

export interface iOverviewSources {
  workspace: iWorkspace;
  stacks: readonly iStack[];
  branches: readonly iBranch[];
  targets: readonly iReviewTarget[];
}

export interface iStackNavigation {
  stack: iOverviewStack;
  branch: iOverviewBranch;
  onSelectBranch: (branch: iOverviewBranch) => unknown;
}

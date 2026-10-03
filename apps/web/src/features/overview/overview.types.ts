import type { iChangeRequestInfo, iInboxProject, iRemoteChange } from '@~/features/code-hosts/code-hosts.types';
import type { iReviewTarget } from '@~/features/reviews/reviews.types';
import type { iBranch, iLocalStack, iWorkspace } from '@~/features/workspaces/workspaces.types';

export interface iOverviewBranch {
  name: string;
  title: string;
  parent?: string;
  local?: iBranch;
  change?: iChangeRequestInfo;
  remote?: iRemoteChange;
  target?: iReviewTarget;
  localTarget?: iReviewTarget;
}

export interface iOverviewStack {
  id: string;
  title: string;
  workspace: iWorkspace;
  base?: string;
  branches: iOverviewBranch[];
  hasCycle: boolean;
}

export interface iOverviewSources {
  workspaces: readonly iWorkspace[];
  localStacks: readonly iLocalStack[];
  projects: readonly iInboxProject[];
  targets: readonly iReviewTarget[];
}

export interface iStackNavigation {
  stack: iOverviewStack;
  branch: iOverviewBranch;
  onSelectBranch: (branch: iOverviewBranch) => unknown;
}

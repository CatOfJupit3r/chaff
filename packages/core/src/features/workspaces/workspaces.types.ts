import type { BranchParentSource } from '@chaff/common/enums/branch-parent.enums';

import type { workspaces } from '@~/db/schema/workspaces.schema';

type WorkspaceRow = typeof workspaces.$inferSelect;

export type iWorkspaceRecord = Omit<WorkspaceRow, 'defaultBranch'> & {
  defaultBranch?: string;
};

export type iNewWorkspace = Pick<typeof workspaces.$inferInsert, 'name' | 'repoPath' | 'defaultBranch'>;

export type iWorkspaceResponse = Omit<iWorkspaceRecord, 'updatedAt' | 'knownParents'> & {
  isAvailable: boolean;
};

export interface iBranchResponse {
  name: string;
  headSha: string;
  subject: string;
  authorName: string;
  committedAt: Date;
  upstream?: string;
  /** Remote the branch is read from when it has no local branch, such as `origin`. */
  remote?: string;
  isDefault: boolean;
  suggestedParent?: string;
  commitsAhead: number;
  isAuthoredByUser: boolean;
  parent?: string;
  parentSource: BranchParentSource;
  isParentMoved: boolean;
  worktreePath?: string;
  hasWorkingChanges: boolean;
}

/** A branch as read from git, before Chaff adds its confirmed parent and working-changes state. */
export type iGitBranch = Omit<
  iBranchResponse,
  'parent' | 'parentSource' | 'isParentMoved' | 'worktreePath' | 'hasWorkingChanges'
>;

/** How a repository's stack list is shown: hidden stacks, filters and whether remote branches are listed. */
export type iStackView = Partial<
  Pick<iWorkspaceRecord, 'hiddenStacks' | 'stackFilters' | 'shouldIncludeRemoteBranches'>
>;

export type iStackViewInput = iStackView & {
  workspaceId: string;
};

export interface iBranchStatInput {
  workspaceId: string;
  branch: string;
  parentBranch: string;
}

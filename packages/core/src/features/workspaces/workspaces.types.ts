import type { workspaces } from '@~/db/schema/workspaces.schema';

type WorkspaceRow = typeof workspaces.$inferSelect;

export type iWorkspaceRecord = Omit<WorkspaceRow, 'defaultBranch'> & {
  defaultBranch?: string;
};

export type iNewWorkspace = Pick<typeof workspaces.$inferInsert, 'name' | 'repoPath' | 'defaultBranch'>;

export type iWorkspaceResponse = Omit<iWorkspaceRecord, 'updatedAt'> & {
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
  isAuthoredByUser: boolean;
  worktreePath?: string;
  hasWorkingChanges: boolean;
}

/** A branch as read from git, before Chaff adds its worktree and working-changes state. */
export type iGitBranch = Omit<iBranchResponse, 'worktreePath' | 'hasWorkingChanges'>;

export type iStackViewInput = Pick<iWorkspaceRecord, 'stackFilters'> & {
  workspaceId: string;
};

export interface iBranchStatInput {
  workspaceId: string;
  branch: string;
  parentBranch: string;
}

/** A branch and the branch it merges into, when that is known. */
export interface iBranchLink {
  branch: string;
  parent?: string;
}

export interface iBranchLinkStatus {
  branch: string;
  commitsAhead: number;
  isParentMoved: boolean;
  isMissing: boolean;
}

/** A branch near another one in the history, and the commits between their tips. */
export interface iNearbyBranch {
  name: string;
  remote?: string;
  commitsApart: number;
}

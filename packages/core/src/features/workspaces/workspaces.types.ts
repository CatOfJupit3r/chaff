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
  isDefault: boolean;
  suggestedParent?: string;
  commitsAhead: number;
  parent?: string;
  isParentConfirmed: boolean;
  isParentMoved: boolean;
  worktreePath?: string;
  hasWorkingChanges: boolean;
}

/** A branch as read from git, before Chaff adds its confirmed parent and working-changes state. */
export type iGitBranch = Omit<
  iBranchResponse,
  'parent' | 'isParentConfirmed' | 'isParentMoved' | 'worktreePath' | 'hasWorkingChanges'
>;

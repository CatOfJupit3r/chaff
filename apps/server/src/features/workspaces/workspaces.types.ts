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
  isDefault: boolean;
  suggestedParent?: string;
  commitsAhead: number;
}

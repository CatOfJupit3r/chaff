import type { iNewWorkspace, iWorkspaceRecord } from './workspaces.types';

export interface iWorkspaceRepository {
  list: () => Promise<iWorkspaceRecord[]>;
  findById: (workspaceId: string) => Promise<iWorkspaceRecord | undefined>;
  findByRepoPath: (repoPath: string) => Promise<iWorkspaceRecord | undefined>;
  create: (input: iNewWorkspace) => Promise<iWorkspaceRecord>;
  delete: (workspaceId: string) => Promise<boolean>;
}

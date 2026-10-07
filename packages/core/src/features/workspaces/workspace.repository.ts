import type { iNewWorkspace, iWorkspaceRecord } from './workspaces.types';

export interface iWorkspaceRepository {
  list: () => Promise<iWorkspaceRecord[]>;
  findById: (workspaceId: string) => Promise<iWorkspaceRecord | undefined>;
  findByRepoPath: (repoPath: string) => Promise<iWorkspaceRecord | undefined>;
  create: (input: iNewWorkspace) => Promise<iWorkspaceRecord>;
  updateRemote: (
    workspaceId: string,
    remote: Pick<iWorkspaceRecord, 'remoteConnectionId' | 'remoteProject'>,
  ) => Promise<iWorkspaceRecord | undefined>;
  updateStackFilters: (
    workspaceId: string,
    stackFilters: iWorkspaceRecord['stackFilters'],
  ) => Promise<iWorkspaceRecord | undefined>;
  delete: (workspaceId: string) => Promise<boolean>;
}

import type { iNewWorkspace, iStackView, iWorkspaceRecord } from './workspaces.types';

export interface iWorkspaceRepository {
  list: () => Promise<iWorkspaceRecord[]>;
  findById: (workspaceId: string) => Promise<iWorkspaceRecord | undefined>;
  findByRepoPath: (repoPath: string) => Promise<iWorkspaceRecord | undefined>;
  create: (input: iNewWorkspace) => Promise<iWorkspaceRecord>;
  updateRemote: (
    workspaceId: string,
    remote: Pick<iWorkspaceRecord, 'remoteConnectionId' | 'remoteProject'>,
  ) => Promise<iWorkspaceRecord | undefined>;
  updateStackView: (workspaceId: string, view: iStackView) => Promise<iWorkspaceRecord | undefined>;
  updateKnownParents: (workspaceId: string, knownParents: iWorkspaceRecord['knownParents']) => Promise<unknown>;
  delete: (workspaceId: string) => Promise<boolean>;
}

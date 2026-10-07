import { singleton } from 'tsyringe';

import type { iWorkspaceRecord } from '@~/features/workspaces/workspaces.types';

import type { iRemoteChange, iWorkspaceRemote } from './code-hosts.types';
import { ConnectionsService } from './connections.service';
import { RemoteProjectsService } from './remote-projects.service';

/** How long a project's open changes are reused before the host is asked again. */
const CHANGE_PARENTS_CACHE_MS = 60_000;

interface iCachedParents {
  at: number;
  parents: ReadonlyMap<string, string>;
}

/**
 * The parent of every branch with an open merge or pull request: the change's target branch, which everyone
 * on the project sees and which survives the parent being rebased or moving on. Changes from forks are left
 * out, as their branch names belong to another repository. A host that cannot be reached keeps the parents it
 * reported last; a repository with no linked project has none.
 */
@singleton()
export class ChangeParentsService {
  private readonly cache = new Map<string, iCachedParents>();

  constructor(
    private readonly remoteProjectsService: RemoteProjectsService,
    private readonly connectionsService: ConnectionsService,
  ) {}

  /** Target branch by source branch. */
  public async forWorkspace(workspace: iWorkspaceRecord): Promise<ReadonlyMap<string, string>> {
    const remote = await this.remoteProjectsService.resolve(workspace).catch(() => undefined);
    if (!remote) return new Map();
    const key = `${remote.connection.id}:${remote.project}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CHANGE_PARENTS_CACHE_MS) return cached.parents;
    try {
      const parents = this.parentsOf(await this.openChanges(remote));
      this.cache.set(key, { at: Date.now(), parents });
      return parents;
    } catch {
      return cached?.parents ?? new Map();
    }
  }

  private async openChanges(remote: iWorkspaceRemote) {
    const { provider, access } = await this.connectionsService.access(remote.connection);
    return provider.listChanges(access, remote.project);
  }

  /** Changes come newest first, so a branch with several open changes keeps the target of the latest one. */
  private parentsOf(changes: readonly iRemoteChange[]) {
    const parents = new Map<string, string>();
    for (const change of changes) {
      if (change.isFromFork || change.sourceBranch === change.targetBranch || parents.has(change.sourceBranch)) {
        continue;
      }
      parents.set(change.sourceBranch, change.targetBranch);
    }
    return parents;
  }
}

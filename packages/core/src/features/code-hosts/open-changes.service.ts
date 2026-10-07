import { singleton } from 'tsyringe';

import type { CodeHost } from '@chaff/common/enums/code-host.enums';

import type { iWorkspaceRecord } from '@~/features/workspaces/workspaces.types';

import type { iRemoteChange, iWorkspaceRemote } from './code-hosts.types';
import { ConnectionsService } from './connections.service';
import { RemoteProjectsService } from './remote-projects.service';

/** How long a project's open changes are reused before the host is asked again. */
const OPEN_CHANGES_CACHE_MS = 60_000;

export interface iOpenChanges {
  /** The linked project; unset when the repository has none. */
  remote?: { host: CodeHost; project: string };
  /** Newest first, one per source branch. */
  changes: readonly iRemoteChange[];
}

interface iCachedChanges {
  at: number;
  changes: readonly iRemoteChange[];
}

/**
 * The open merge or pull requests of a repository's linked project, the code host's view of how its branches
 * stack. Changes from forks are left out, as their branch names belong to another repository, and a branch
 * with several open changes keeps the newest. A host that cannot be reached keeps the changes it reported
 * last; a repository with no linked project has none.
 */
@singleton()
export class OpenChangesService {
  private readonly cache = new Map<string, iCachedChanges>();

  constructor(
    private readonly remoteProjectsService: RemoteProjectsService,
    private readonly connectionsService: ConnectionsService,
  ) {}

  public async forWorkspace(workspace: iWorkspaceRecord): Promise<iOpenChanges> {
    const remote = await this.remoteProjectsService.resolve(workspace).catch(() => undefined);
    if (!remote) return { changes: [] };
    const linked = { host: remote.connection.host, project: remote.project };
    const key = `${remote.connection.id}:${remote.project}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < OPEN_CHANGES_CACHE_MS) return { remote: linked, changes: cached.changes };
    try {
      const changes = this.stackable(await this.read(remote));
      this.cache.set(key, { at: Date.now(), changes });
      return { remote: linked, changes };
    } catch {
      return { remote: linked, changes: cached?.changes ?? [] };
    }
  }

  private async read(remote: iWorkspaceRemote) {
    const { provider, access } = await this.connectionsService.access(remote.connection);
    return provider.listChanges(access, remote.project);
  }

  private stackable(changes: readonly iRemoteChange[]) {
    const bySource = new Map<string, iRemoteChange>();
    for (const change of changes) {
      if (change.isFromFork || change.sourceBranch === change.targetBranch || bySource.has(change.sourceBranch)) {
        continue;
      }
      bySource.set(change.sourceBranch, change);
    }
    return [...bySource.values()];
  }
}

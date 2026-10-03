import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';

import { WORKSPACE_REPOSITORY_TOKEN } from '@~/di/tokens';
import { GitService } from '@~/features/git/git.service';
import type { iWorkspaceRepository } from '@~/features/workspaces/workspace.repository';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import type { iWorkspaceRecord } from '@~/features/workspaces/workspaces.types';
import { ORPCBadRequestError, ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import type { iConnectionRecord, iWorkspaceRemote } from './code-hosts.types';
import { ConnectionsService } from './connections.service';
import { parseRemoteUrl, REMOTE_PROJECT_PATTERN } from './remote-url.utils';

const PREFERRED_REMOTE = 'origin';

function hostnameOf(baseUrl: string) {
  return new URL(baseUrl).hostname.toLowerCase();
}

/**
 * Which GitLab or GitHub project a repository's merge requests come from: the one chosen in Settings,
 * or else the first remote (origin first) whose host matches a connection.
 */
@singleton()
export class RemoteProjectsService {
  constructor(
    @inject(WORKSPACE_REPOSITORY_TOKEN) private readonly workspaceRepository: iWorkspaceRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly connectionsService: ConnectionsService,
    private readonly gitService: GitService,
  ) {}

  public async resolve(
    workspace: iWorkspaceRecord,
    connections?: iConnectionRecord[],
  ): Promise<iWorkspaceRemote | undefined> {
    const known = connections ?? (await this.connectionsService.listRecords());
    if (workspace.remoteConnectionId && workspace.remoteProject) {
      const connection = known.find((candidate) => candidate.id === workspace.remoteConnectionId);
      if (connection) return { connection, project: workspace.remoteProject, isDetected: false };
    }
    for (const url of await this.remoteUrls(workspace.repoPath)) {
      const remote = parseRemoteUrl(url);
      const connection = remote && known.find((candidate) => hostnameOf(candidate.baseUrl) === remote.hostname);
      if (remote && connection) return { connection, project: remote.project, isDetected: true };
    }
    return undefined;
  }

  public async describe(workspaceId: string) {
    const remote = await this.resolve(await this.workspacesService.getRecord(workspaceId));
    return remote
      ? { connectionId: remote.connection.id, project: remote.project, isDetected: remote.isDetected }
      : null;
  }

  /** Links the repository to a project by hand, or clears the link so it is detected again. */
  public async set(workspaceId: string, link: { connectionId: string; project: string } | null) {
    await this.workspacesService.getRecord(workspaceId);
    if (link) {
      await this.connectionsService.getRecord(link.connectionId);
      if (!REMOTE_PROJECT_PATTERN.test(link.project)) throw ORPCBadRequestError(errorCodes.REMOTE_PROJECT_NOT_FOUND);
    }
    const updated = await this.workspaceRepository.updateRemote(workspaceId, {
      remoteConnectionId: link?.connectionId ?? null,
      remoteProject: link?.project ?? null,
    });
    if (!updated) throw ORPCNotFoundError(errorCodes.WORKSPACE_NOT_FOUND);
    return this.describe(workspaceId);
  }

  private async remoteUrls(repoPath: string) {
    const { stdout } = await this.gitService.run(repoPath, ['config', '--get-regexp', '^remote\\..*\\.url$'], {
      allowFailure: true,
    });
    const remotes = stdout
      .split('\n')
      .map((line) => /^remote\.(.+)\.url (.+)$/.exec(line.trim()))
      .flatMap((match) => (match?.[1] && match[2] ? [{ name: match[1], url: match[2] }] : []));
    return remotes
      .toSorted((left, right) => Number(right.name === PREFERRED_REMOTE) - Number(left.name === PREFERRED_REMOTE))
      .map((remote) => remote.url);
  }
}

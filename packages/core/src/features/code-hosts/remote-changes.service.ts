import { singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';

import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';
import type { iSnapshotLiveStatus } from '@~/features/reviews/reviews.types';
import { SnapshotStoreService } from '@~/features/reviews/snapshots/snapshot-store.service';
import type { iSnapshotHeads, iSnapshotRecord } from '@~/features/reviews/snapshots/snapshots.types';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import type { iWorkspaceRecord } from '@~/features/workspaces/workspaces.types';
import { ORPCNotFoundError, ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import { ConnectionsService } from './connections.service';
import { RemoteProjectsService } from './remote-projects.service';

/** How long a host's answer about a change is reused, so polling the review doesn't hammer the API. */
const STATUS_CACHE_MS = 30_000;

interface iCachedStatus {
  at: number;
  status: iSnapshotLiveStatus;
}

/**
 * Reads merge and pull requests that are under review: copying them into the store and telling the
 * review what moved on the host since its snapshot.
 */
@singleton()
export class RemoteChangesService {
  private readonly statusCache = new Map<string, iCachedStatus>();

  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly remoteProjectsService: RemoteProjectsService,
    private readonly workspacesService: WorkspacesService,
    private readonly snapshotStoreService: SnapshotStoreService,
  ) {}

  /** The provider, credentials, project and number of a change target. */
  public async locate(target: iReviewTargetRecord) {
    if (target.changeNumber === null || !target.remoteProject) {
      throw ORPCNotFoundError(errorCodes.CHANGE_REQUEST_NOT_FOUND);
    }
    const connection = target.connectionId
      ? (await this.connectionsService.listRecords()).find((candidate) => candidate.id === target.connectionId)
      : undefined;
    const resolved =
      connection ??
      (await this.remoteProjectsService.resolve(await this.workspacesService.getRecord(target.workspaceId)))
        ?.connection;
    if (!resolved) throw ORPCNotFoundError(errorCodes.CONNECTION_NOT_FOUND);
    const { provider, access } = await this.connectionsService.access(resolved);
    return { provider, access, project: target.remoteProject, changeNumber: target.changeNumber };
  }

  public async fetchHeads(workspace: iWorkspaceRecord, target: iReviewTargetRecord): Promise<iSnapshotHeads> {
    const { provider, access, project, changeNumber } = await this.locate(target);
    const url = await provider.cloneUrl(access, project);
    try {
      return await this.snapshotStoreService.fetchRemoteHeads(workspace, {
        url,
        authorization: provider.gitAuthorization(access.token),
        headRef: provider.changeRef(changeNumber),
        parentBranch: target.parentBranch,
      });
    } catch {
      throw ORPCUnprocessableContentError(errorCodes.CODE_HOST_UNREACHABLE);
    }
  }

  public async isUnchanged(target: iReviewTargetRecord, latest: iSnapshotRecord) {
    const status = await this.liveStatus(target, latest, { isFresh: true });
    return status.newCommitCount === 0 && !status.isBranchRewritten && !status.isParentMoved;
  }

  /** Compares the snapshot with the change's head and its target branch on the host. */
  public async liveStatus(
    target: iReviewTargetRecord,
    snapshot: iSnapshotRecord,
    options: { isFresh?: boolean } = {},
  ): Promise<iSnapshotLiveStatus> {
    const cached = this.statusCache.get(snapshot.id);
    if (!options.isFresh && cached && Date.now() - cached.at < STATUS_CACHE_MS) return cached.status;

    const { provider, access, project, changeNumber } = await this.locate(target);
    const [change, parentSha] = await Promise.all([
      provider.getChange(access, project, changeNumber),
      provider.branchHead(access, project, target.parentBranch),
    ]);
    const unchanged = {
      isBranchMissing: false,
      newCommitCount: 0,
      isBranchRewritten: false,
      isParentMoved: parentSha !== undefined && parentSha !== snapshot.parentHeadSha,
      isParentChanged: target.parentBranch !== snapshot.parentBranch,
      hasNewWorkingChanges: false,
    };
    let status: iSnapshotLiveStatus = unchanged;
    if (!change) status = { ...unchanged, isBranchMissing: true };
    else if (change.headSha !== snapshot.headSha) {
      const commits = await provider.listChangeCommits(access, project, changeNumber);
      const index = commits.indexOf(snapshot.headSha);
      status = index === -1 ? { ...unchanged, isBranchRewritten: true } : { ...unchanged, newCommitCount: index };
    }
    this.statusCache.set(snapshot.id, { at: Date.now(), status });
    return status;
  }

  /** The host's diff version whose head is `headSha`; undefined on GitHub, or while GitLab has not made it yet. */
  public async versionOf(target: iReviewTargetRecord, headSha: string) {
    const { provider, access, project, changeNumber } = await this.locate(target);
    return (await provider.diffRefs(access, project, changeNumber, headSha))?.version;
  }

  public forget(snapshotId: string) {
    this.statusCache.delete(snapshotId);
  }
}

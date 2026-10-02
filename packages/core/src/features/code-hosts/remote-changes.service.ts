import { inject, singleton } from 'tsyringe';

import type { ChangeState } from '@chaff/common/enums/code-host.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import { REVIEW_TARGET_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iReviewTargetRepository } from '@~/features/reviews/review-targets/review-target.repository';
import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';
import { changeArchiveChange } from '@~/features/reviews/review-targets/target-archive.utils';
import type { iSnapshotLiveStatus } from '@~/features/reviews/reviews.types';
import { SnapshotStoreService } from '@~/features/reviews/snapshots/snapshot-store.service';
import type { iSnapshotHeads, iSnapshotRecord } from '@~/features/reviews/snapshots/snapshots.types';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import type { iWorkspaceRecord } from '@~/features/workspaces/workspaces.types';
import { ORPCNotFoundError, ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import { ConnectionsService } from './connections.service';
import { issueRefs } from './issue-refs.utils';
import { RemoteProjectsService } from './remote-projects.service';

/** How long a host's answer about a change is reused, so polling the review doesn't hammer the API. */
const STATUS_CACHE_MS = 30_000;

interface iCachedStatus {
  at: number;
  status: iSnapshotLiveStatus;
}

/** Issues read from a change's description, at most. */
const MAX_LINKED_ISSUES = 3;
/** Characters kept of a change's or an issue's description. */
const MAX_DESCRIPTION_CHARS = 8000;

/**
 * Reads merge and pull requests that are under review: copying them into the store, telling the review
 * what moved on the host since its snapshot, and moving it to History once the change is merged or closed.
 */
@singleton()
export class RemoteChangesService {
  private readonly statusCache = new Map<string, iCachedStatus>();

  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly remoteProjectsService: RemoteProjectsService,
    private readonly workspacesService: WorkspacesService,
    private readonly snapshotStoreService: SnapshotStoreService,
    @inject(REVIEW_TARGET_REPOSITORY_TOKEN) private readonly reviewTargetRepository: iReviewTargetRepository,
  ) {}

  /** Asks the host whether the change is still open and archives or restores its review to match. */
  public async syncArchive(target: iReviewTargetRecord) {
    const { provider, access, project, changeNumber } = await this.locate(target);
    const change = await provider.getChange(access, project, changeNumber);
    if (change) await this.archiveByState(target, change.state);
  }

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
      isWatched: false,
      isBranchMissing: false,
      newCommitCount: 0,
      isBranchRewritten: false,
      isParentMoved: parentSha !== undefined && parentSha !== snapshot.parentHeadSha,
      isParentChanged: target.parentBranch !== snapshot.parentBranch,
      hasNewWorkingChanges: false,
    };
    if (change) await this.archiveByState(target, change.state);
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

  /** The change's title and description, and the issues it mentions, for an agent to read as intent. */
  public async describe(target: iReviewTargetRecord) {
    const { provider, access, project, changeNumber } = await this.locate(target);
    const change = await provider.getChange(access, project, changeNumber);
    if (!change) return undefined;
    const issues = await Promise.all(
      issueRefs(change.description, changeNumber, MAX_LINKED_ISSUES).map(async (number) =>
        provider.getIssue(access, project, number).catch(() => undefined),
      ),
    );
    return {
      title: change.title,
      description: change.description.slice(0, MAX_DESCRIPTION_CHARS),
      issues: issues
        .filter((issue) => issue !== undefined)
        .map((issue) => ({ ...issue, description: issue.description.slice(0, MAX_DESCRIPTION_CHARS) })),
    };
  }

  public forget(snapshotId: string) {
    this.statusCache.delete(snapshotId);
  }

  private async archiveByState(target: iReviewTargetRecord, state: ChangeState) {
    const change = changeArchiveChange(target, state);
    if (change) await this.reviewTargetRepository.setArchive(change.targetId, change.archive);
  }
}

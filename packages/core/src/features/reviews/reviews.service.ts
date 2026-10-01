import { randomUUID } from 'node:crypto';
import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { IS_INSPECTED_MARK, UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { REVIEW_TARGET_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN, UNIT_MARK_REPOSITORY_TOKEN } from '@~/di/tokens';
import { GitService } from '@~/features/git/git.service';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import type { iWorkspaceRecord } from '@~/features/workspaces/workspaces.types';
import { KeyedMutex } from '@~/lib/concurrency';
import { ORPCBadRequestError, ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import type { iUnitMarkRepository } from './marks/unit-mark.repository';
import type { iReviewTargetRepository } from './review-targets/review-target.repository';
import type { iReviewTargetRecord } from './review-targets/review-targets.types';
import type {
  iReviewTargetResponse,
  iSnapshotLiveStatus,
  iSnapshotResponse,
  iSnapshotSummary,
  iStartReviewInput,
} from './reviews.types';
import { SnapshotBuilderService } from './snapshots/snapshot-builder.service';
import { SnapshotStoreService } from './snapshots/snapshot-store.service';
import type { iSnapshotRepository } from './snapshots/snapshot.repository';
import type { iSnapshotHeads, iSnapshotRecord } from './snapshots/snapshots.types';

/** Larger files are not sent to the renderer for context expansion. */
const MAX_CONTENT_BYTES = 5_000_000;

/**
 * Review targets and their snapshots. Starting a review freezes the branch as a snapshot; later
 * commits only reach the review when it is refreshed, which freezes a new snapshot.
 */
@singleton()
export class ReviewsService {
  private readonly captureMutex = new KeyedMutex();

  constructor(
    @inject(REVIEW_TARGET_REPOSITORY_TOKEN) private readonly reviewTargetRepository: iReviewTargetRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly snapshotStoreService: SnapshotStoreService,
    private readonly snapshotBuilderService: SnapshotBuilderService,
    private readonly gitService: GitService,
    @inject(UNIT_MARK_REPOSITORY_TOKEN) private readonly unitMarkRepository: iUnitMarkRepository,
  ) {}

  public async list(workspaceId?: string): Promise<iReviewTargetResponse[]> {
    const targets = await this.reviewTargetRepository.list(workspaceId);
    return Promise.all(
      targets.map(async ({ id, workspaceId: targetWorkspaceId, branch, parentBranch }) => {
        const latest = await this.snapshotRepository.findLatest(id);
        return {
          id,
          workspaceId: targetWorkspaceId,
          branch,
          parentBranch,
          latestSnapshot: latest ? await this.toSummary(latest) : undefined,
        };
      }),
    );
  }

  /** Opens the branch's newest snapshot, freezing the first one when the review is new. */
  public async start(input: iStartReviewInput) {
    if (input.branch === input.parentBranch) throw ORPCBadRequestError(errorCodes.INVALID_PARENT_BRANCH);
    const workspace = await this.workspacesService.getRecord(input.workspaceId);

    return this.captureMutex.run(this.captureKey(workspace.id, input.branch), async () => {
      let target = await this.reviewTargetRepository.findByBranch(workspace.id, input.branch);
      const latest = target ? await this.snapshotRepository.findLatest(target.id) : undefined;
      if (target && latest) return { targetId: target.id, snapshotId: latest.id };

      // Without a snapshot nothing has been reviewed yet, so the parent can still change.
      if (target && target.parentBranch !== input.parentBranch) {
        target = await this.reviewTargetRepository.updateParent(target.id, input.parentBranch);
      }
      target ??= await this.reviewTargetRepository.create(input);
      if (!target) throw ORPCNotFoundError(errorCodes.REVIEW_TARGET_NOT_FOUND);

      const snapshot = await this.capture(workspace, target);
      return { targetId: target.id, snapshotId: snapshot.id };
    });
  }

  /** Freezes a new snapshot when the branch or its parent moved since the newest one. */
  public async refresh(targetId: string) {
    const target = await this.getTarget(targetId);
    const workspace = await this.workspacesService.getRecord(target.workspaceId);

    return this.captureMutex.run(this.captureKey(workspace.id, target.branch), async () => {
      const heads = await this.snapshotStoreService.fetchHeads(workspace, target.branch, target.parentBranch);
      const latest = await this.snapshotRepository.findLatest(target.id);
      const isUnchanged = latest?.headSha === heads.headSha && latest.parentHeadSha === heads.parentHeadSha;
      if (latest && isUnchanged) return { targetId: target.id, snapshotId: latest.id, isNew: false };

      const snapshot = await this.capture(workspace, target, heads);
      return { targetId: target.id, snapshotId: snapshot.id, isNew: true };
    });
  }

  public async getSnapshot(snapshotId: string): Promise<iSnapshotResponse> {
    const snapshot = await this.getSnapshotRecord(snapshotId);
    const target = await this.getTarget(snapshot.targetId);
    const [latest, files] = await Promise.all([
      this.snapshotRepository.findLatest(target.id),
      this.snapshotRepository.listFiles(snapshot.id),
    ]);
    return {
      ...(await this.toSummary(snapshot)),
      targetId: target.id,
      workspaceId: target.workspaceId,
      branch: target.branch,
      parentBranch: snapshot.parentBranch,
      parentHeadSha: snapshot.parentHeadSha,
      baseSha: snapshot.baseSha,
      latestVersion: latest?.version ?? snapshot.version,
      files,
    };
  }

  /** Reads the branch and its parent from the user's repository and compares them with the snapshot. */
  public async getLiveStatus(snapshotId: string): Promise<iSnapshotLiveStatus> {
    const snapshot = await this.getSnapshotRecord(snapshotId);
    const target = await this.getTarget(snapshot.targetId);
    const { repoPath } = await this.workspacesService.getRecord(target.workspaceId);

    const [branchSha, parentSha] = await Promise.all([
      this.snapshotStoreService.resolveBranch(repoPath, target.branch),
      this.snapshotStoreService.resolveBranch(repoPath, snapshot.parentBranch),
    ]);
    const isParentMoved = parentSha !== snapshot.parentHeadSha;
    if (!branchSha) return { isBranchMissing: true, newCommitCount: 0, isBranchRewritten: false, isParentMoved };
    if (branchSha === snapshot.headSha) {
      return { isBranchMissing: false, newCommitCount: 0, isBranchRewritten: false, isParentMoved };
    }

    const ancestry = await this.gitService.run(repoPath, ['merge-base', '--is-ancestor', snapshot.headSha, branchSha], {
      allowFailure: true,
    });
    if (ancestry.exitCode !== 0) {
      return { isBranchMissing: false, newCommitCount: 0, isBranchRewritten: true, isParentMoved };
    }
    const newCommits = await this.gitService.output(repoPath, [
      'rev-list',
      '--count',
      `${snapshot.headSha}..${branchSha}`,
    ]);
    return { isBranchMissing: false, newCommitCount: Number(newCommits), isBranchRewritten: false, isParentMoved };
  }

  /** The snapshot and the review it belongs to. */
  public async getContext(snapshotId: string) {
    const snapshot = await this.getSnapshotRecord(snapshotId);
    const target = await this.getTarget(snapshot.targetId);
    return { snapshot, target };
  }

  public async getFileDiff(snapshotId: string, fileId: string) {
    const file = await this.snapshotRepository.findPatch(snapshotId, fileId);
    if (!file) throw ORPCNotFoundError(errorCodes.SNAPSHOT_FILE_NOT_FOUND);
    return { patch: file.patch ?? null };
  }

  public async getFileContents(snapshotId: string, fileId: string) {
    const snapshot = await this.getSnapshotRecord(snapshotId);
    const file = await this.snapshotRepository.findFile(snapshotId, fileId);
    if (!file) throw ORPCNotFoundError(errorCodes.SNAPSHOT_FILE_NOT_FOUND);
    if (file.isBinary) return { oldContents: null, newContents: null };

    const target = await this.getTarget(snapshot.targetId);
    const shas = [file.oldBlobSha, file.newBlobSha].filter((sha): sha is string => sha !== undefined);
    const blobs = await this.snapshotStoreService.readBlobs(target.workspaceId, shas, MAX_CONTENT_BYTES);
    const contentsOf = (sha: string | undefined) => (sha ? (blobs.get(sha)?.toString('utf8') ?? null) : null);
    return { oldContents: contentsOf(file.oldBlobSha), newContents: contentsOf(file.newBlobSha) };
  }

  private async capture(workspace: iWorkspaceRecord, target: iReviewTargetRecord, knownHeads?: iSnapshotHeads) {
    const heads =
      knownHeads ?? (await this.snapshotStoreService.fetchHeads(workspace, target.branch, target.parentBranch));
    const baseSha = await this.snapshotStoreService.mergeBase(workspace.id, heads);
    const shas = { ...heads, baseSha };
    const { content, totals } = await this.snapshotBuilderService.build(workspace.id, baseSha, heads.headSha);
    const latest = await this.snapshotRepository.findLatest(target.id);

    const snapshotId = randomUUID();
    await this.snapshotStoreService.pin(workspace.id, snapshotId, shas);
    try {
      const snapshot = await this.snapshotRepository.create(
        {
          id: snapshotId,
          targetId: target.id,
          version: (latest?.version ?? 0) + 1,
          parentBranch: target.parentBranch,
          ...shas,
          ...totals,
        },
        content,
      );
      // Units whose code did not change keep the reviewer's decision.
      if (latest) await this.unitMarkRepository.carryOver(latest.id, snapshot.id);
      return snapshot;
    } catch (error) {
      await this.snapshotStoreService.unpin(workspace.id, snapshotId, shas);
      throw error;
    }
  }

  private async toSummary(snapshot: iSnapshotRecord): Promise<iSnapshotSummary> {
    const { id, version, headSha, fileCount, additions, deletions, regionCount, unitCount, createdAt } = snapshot;
    const markCounts = await this.unitMarkRepository.countByMark(id);
    const inspectedUnitCount = [...markCounts].reduce(
      (sum, [mark, total]) => (IS_INSPECTED_MARK(mark) ? sum + total : sum),
      0,
    );
    return {
      id,
      version,
      headSha,
      fileCount,
      additions,
      deletions,
      regionCount,
      unitCount,
      inspectedUnitCount,
      laterUnitCount: markCounts.get(UNIT_MARKS.LATER) ?? 0,
      createdAt,
    };
  }

  private captureKey(workspaceId: string, branch: string) {
    return `${workspaceId}\0${branch}`;
  }

  private async getTarget(targetId: string) {
    const target = await this.reviewTargetRepository.findById(targetId);
    if (!target) throw ORPCNotFoundError(errorCodes.REVIEW_TARGET_NOT_FOUND);
    return target;
  }

  private async getSnapshotRecord(snapshotId: string) {
    const snapshot = await this.snapshotRepository.findById(snapshotId);
    if (!snapshot) throw ORPCNotFoundError(errorCodes.SNAPSHOT_NOT_FOUND);
    return snapshot;
  }
}

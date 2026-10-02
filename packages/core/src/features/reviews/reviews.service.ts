import { randomUUID } from 'node:crypto';
import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { IS_INSPECTED_MARK, REVIEW_TARGET_KINDS, UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { REVIEW_TARGET_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN, UNIT_MARK_REPOSITORY_TOKEN } from '@~/di/tokens';
import { RemoteChangesService } from '@~/features/code-hosts/remote-changes.service';
import { AnchorRelocationService } from '@~/features/findings/anchor-relocation.service';
import { GitService } from '@~/features/git/git.service';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import type { iWorkspaceRecord } from '@~/features/workspaces/workspaces.types';
import { KeyedMutex } from '@~/lib/concurrency';
import { ORPCBadRequestError, ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import { ChangeUnitsService } from './change-units/change-units.service';
import type { iUnitMarkRepository } from './marks/unit-mark.repository';
import type { iReviewTargetRepository } from './review-targets/review-target.repository';
import type { iReviewTargetRecord } from './review-targets/review-targets.types';
import type {
  iChangeRequestInfo,
  iReviewTargetResponse,
  iSnapshotLiveStatus,
  iSnapshotResponse,
  iSetParentInput,
  iSnapshotSummary,
  iStartReviewInput,
} from './reviews.types';
import { SecondPassService } from './second-pass/second-pass.service';
import { SnapshotBuilderService } from './snapshots/snapshot-builder.service';
import { SnapshotStoreService, SNAPSHOT_CONTEXT_LINES } from './snapshots/snapshot-store.service';
import type { iPatchOptions } from './snapshots/snapshot-store.service';
import type { iSnapshotRepository } from './snapshots/snapshot.repository';
import type { iSnapshotHeads, iSnapshotRecord } from './snapshots/snapshots.types';

/** Larger files are not sent to the renderer for context expansion. */
const MAX_CONTENT_BYTES = 5_000_000;

function changeInfo(target: iReviewTargetRecord): iChangeRequestInfo | undefined {
  const { codeHost, remoteProject, changeNumber, title, webUrl } = target;
  if (!codeHost || !remoteProject || changeNumber === null) return undefined;
  return { host: codeHost, project: remoteProject, number: changeNumber, title: title ?? '', webUrl: webUrl ?? '' };
}

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
    private readonly remoteChangesService: RemoteChangesService,
    private readonly secondPassService: SecondPassService,
    private readonly anchorRelocationService: AnchorRelocationService,
    private readonly changeUnitsService: ChangeUnitsService,
  ) {}

  public async list(workspaceId?: string): Promise<iReviewTargetResponse[]> {
    const targets = await this.reviewTargetRepository.list(workspaceId);
    return Promise.all(
      targets.map(async (target) => {
        const latest = await this.snapshotRepository.findLatest(target.id);
        return {
          id: target.id,
          workspaceId: target.workspaceId,
          branch: target.branch,
          kind: target.kind,
          parentBranch: target.parentBranch,
          change: changeInfo(target),
          latestSnapshot: latest ? await this.toSummary(latest) : undefined,
          archived:
            target.archivedAt && target.archiveReason
              ? { at: target.archivedAt, reason: target.archiveReason }
              : undefined,
        };
      }),
    );
  }

  /** Opens the branch's newest snapshot, freezing the first one when the review is new. */
  public async start(request: iStartReviewInput) {
    if (request.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST) {
      throw ORPCBadRequestError(errorCodes.CHANGE_REQUEST_NOT_FOUND);
    }
    const isWorkingChanges = request.kind === REVIEW_TARGET_KINDS.WORKING_CHANGES;
    // Working changes are compared with the branch they sit on.
    const input = isWorkingChanges ? { ...request, parentBranch: request.branch } : request;
    if (!isWorkingChanges && input.branch === input.parentBranch) {
      throw ORPCBadRequestError(errorCodes.INVALID_PARENT_BRANCH);
    }
    const workspace = await this.workspacesService.getRecord(input.workspaceId);

    return this.captureMutex.run(this.captureKey(workspace.id, input.branch), async () => {
      let target = await this.reviewTargetRepository.findByBranch(workspace.id, input.branch, input.kind);
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

  /** Opens a target's newest snapshot, freezing the first one when there is none. */
  public async open(targetId: string) {
    const target = await this.getTarget(targetId);
    const workspace = await this.workspacesService.getRecord(target.workspaceId);
    return this.captureMutex.run(this.captureKey(workspace.id, target.branch), async () => {
      const latest = await this.snapshotRepository.findLatest(target.id);
      if (latest) return { targetId: target.id, snapshotId: latest.id };
      const snapshot = await this.capture(workspace, target);
      return { targetId: target.id, snapshotId: snapshot.id };
    });
  }

  /** Freezes a new snapshot when the branch or its parent moved since the newest one. */
  public async refresh(targetId: string) {
    const target = await this.getTarget(targetId);
    const workspace = await this.workspacesService.getRecord(target.workspaceId);

    return this.captureMutex.run(this.captureKey(workspace.id, target.branch), async () => {
      const latest = await this.snapshotRepository.findLatest(target.id);
      if (latest && (await this.isUnchanged(workspace, target, latest))) {
        return { targetId: target.id, snapshotId: latest.id, isNew: false };
      }

      const snapshot = await this.capture(workspace, target);
      return { targetId: target.id, snapshotId: snapshot.id, isNew: true };
    });
  }

  /**
   * Confirms or changes the parent a branch is reviewed against. A review already started keeps its
   * snapshots; the next update compares the branch with the new parent.
   */
  public async setParent(input: iSetParentInput) {
    if (input.branch === input.parentBranch) throw ORPCBadRequestError(errorCodes.INVALID_PARENT_BRANCH);
    const workspace = await this.workspacesService.getRecord(input.workspaceId);
    for (const name of [input.branch, input.parentBranch]) {
      if (!(await this.snapshotStoreService.resolveBranch(workspace.repoPath, name))) {
        throw ORPCNotFoundError(errorCodes.BRANCH_NOT_FOUND, { branch: name });
      }
    }

    const targets = await this.reviewTargetRepository.list(workspace.id);
    const parents = new Map(
      targets
        .filter((target) => target.kind === REVIEW_TARGET_KINDS.BRANCH)
        .map((target) => [target.branch, target.parentBranch]),
    );
    const visited = new Set<string>();
    for (let current: string | undefined = input.parentBranch; current; current = parents.get(current)) {
      if (current === input.branch) throw ORPCBadRequestError(errorCodes.PARENT_CYCLE);
      if (visited.has(current)) break;
      visited.add(current);
    }

    return this.captureMutex.run(this.captureKey(workspace.id, input.branch), async () => {
      const existing = await this.reviewTargetRepository.findByBranch(
        workspace.id,
        input.branch,
        REVIEW_TARGET_KINDS.BRANCH,
      );
      const target = existing
        ? await this.reviewTargetRepository.updateParent(existing.id, input.parentBranch)
        : await this.reviewTargetRepository.create({ ...input, kind: REVIEW_TARGET_KINDS.BRANCH });
      if (!target) throw ORPCNotFoundError(errorCodes.REVIEW_TARGET_NOT_FOUND);
      return { targetId: target.id, branch: target.branch, parentBranch: target.parentBranch };
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
      kind: target.kind,
      parentBranch: snapshot.parentBranch,
      targetParentBranch: target.parentBranch,
      parentHeadSha: snapshot.parentHeadSha,
      baseSha: snapshot.baseSha,
      latestVersion: latest?.version ?? snapshot.version,
      remoteVersion: snapshot.remoteVersion ?? undefined,
      change: changeInfo(target),
      files,
    };
  }

  /** Reads the branch and its parent from the user's repository and compares them with the snapshot. */
  public async getLiveStatus(snapshotId: string): Promise<iSnapshotLiveStatus> {
    const snapshot = await this.getSnapshotRecord(snapshotId);
    const target = await this.getTarget(snapshot.targetId);
    if (target.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST) {
      return this.remoteChangesService.liveStatus(target, snapshot);
    }
    const { repoPath } = await this.workspacesService.getRecord(target.workspaceId);
    const isWorkingChanges = target.kind === REVIEW_TARGET_KINDS.WORKING_CHANGES;
    // The commit a working-changes snapshot sits on is its parent head; its own head exists only in the store.
    const committedSha = isWorkingChanges ? snapshot.parentHeadSha : snapshot.headSha;

    const [branchSha, parentSha] = await Promise.all([
      this.snapshotStoreService.resolveBranch(repoPath, target.branch),
      this.snapshotStoreService.resolveBranch(repoPath, snapshot.parentBranch),
    ]);
    const unchanged = {
      isBranchMissing: false,
      newCommitCount: 0,
      isBranchRewritten: false,
      isParentMoved: !isWorkingChanges && parentSha !== snapshot.parentHeadSha,
      isParentChanged: target.parentBranch !== snapshot.parentBranch,
      hasNewWorkingChanges: isWorkingChanges
        ? await this.hasNewWorkingChanges(repoPath, target.branch, snapshot)
        : false,
    };
    if (!branchSha) return { ...unchanged, isBranchMissing: true };
    if (branchSha === committedSha) return unchanged;

    const ancestry = await this.gitService.run(repoPath, ['merge-base', '--is-ancestor', committedSha, branchSha], {
      allowFailure: true,
    });
    if (ancestry.exitCode !== 0) return { ...unchanged, isBranchRewritten: true };
    const newCommits = await this.gitService.output(repoPath, ['rev-list', '--count', `${committedSha}..${branchSha}`]);
    return { ...unchanged, newCommitCount: Number(newCommits) };
  }

  /** The review target and the workspace it belongs to. */
  public async getTargetContext(targetId: string) {
    const target = await this.getTarget(targetId);
    return { target, workspace: await this.workspacesService.getRecord(target.workspaceId) };
  }

  /** The snapshot and the review it belongs to. */
  public async getContext(snapshotId: string) {
    const snapshot = await this.getSnapshotRecord(snapshotId);
    const target = await this.getTarget(snapshot.targetId);
    return { snapshot, target };
  }

  /**
   * The file's patch as frozen with the snapshot. Asking for other context or for whitespace to be ignored
   * diffs the file again between the snapshot's commits in the store; a file whose only changes are
   * whitespace keeps its frozen patch.
   */
  public async getFileDiff(snapshotId: string, fileId: string, options: iPatchOptions = {}) {
    const file = await this.snapshotRepository.findPatch(snapshotId, fileId);
    if (!file) throw ORPCNotFoundError(errorCodes.SNAPSHOT_FILE_NOT_FOUND);
    const contextLines = options.contextLines ?? SNAPSHOT_CONTEXT_LINES;
    const isWhitespaceIgnored = options.isWhitespaceIgnored ?? false;
    if (!file.patch || (contextLines === SNAPSHOT_CONTEXT_LINES && !isWhitespaceIgnored)) {
      return { patch: file.patch ?? null };
    }
    const { snapshot, target } = await this.getContext(snapshotId);
    const record = await this.snapshotRepository.findFile(snapshotId, fileId);
    if (!record) throw ORPCNotFoundError(errorCodes.SNAPSHOT_FILE_NOT_FOUND);
    const patch = await this.snapshotStoreService.patch(target.workspaceId, snapshot.baseSha, snapshot.headSha, {
      contextLines,
      isWhitespaceIgnored,
      paths: record.oldPath ? [record.oldPath, record.path] : [record.path],
    });
    return { patch: patch.trim() ? patch : file.patch };
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

  private async capture(workspace: iWorkspaceRecord, target: iReviewTargetRecord) {
    const { heads, workingFingerprint } = await this.readHeads(workspace, target);
    const remoteVersion =
      target.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST
        ? await this.remoteChangesService.versionOf(target, heads.headSha).catch(() => undefined)
        : undefined;
    const baseSha = await this.snapshotStoreService.mergeBase(workspace.id, heads);
    const shas = { ...heads, baseSha };
    const { content, totals } = await this.snapshotBuilderService.build(workspace.id, baseSha, heads.headSha);
    const latest = await this.snapshotRepository.findLatest(target.id);

    const snapshotId = randomUUID();
    await this.snapshotStoreService.pin(workspace.id, snapshotId, shas);
    let snapshot: iSnapshotRecord;
    try {
      snapshot = await this.snapshotRepository.create(
        {
          id: snapshotId,
          targetId: target.id,
          version: (latest?.version ?? 0) + 1,
          parentBranch: target.parentBranch,
          ...shas,
          ...totals,
          workingFingerprint,
          remoteVersionId: remoteVersion?.id ?? null,
          remoteVersion: remoteVersion?.number ?? null,
        },
        content,
      );
    } catch (error) {
      await this.snapshotStoreService.unpin(workspace.id, snapshotId, shas);
      throw error;
    }
    if (latest) await this.startSecondPass(workspace, target, latest, snapshot);
    return snapshot;
  }

  /**
   * Units whose code did not change keep the reviewer's decision, every unit learns how it compares with
   * the previous snapshot, and findings are looked for in the new code.
   */
  private async startSecondPass(
    workspace: iWorkspaceRecord,
    target: iReviewTargetRecord,
    previous: iSnapshotRecord,
    snapshot: iSnapshotRecord,
  ) {
    await this.unitMarkRepository.carryOver(previous.id, snapshot.id);
    await this.secondPassService.classify(workspace.id, previous.id, snapshot.id);
    await this.changeUnitsService.carryOver(previous.id, snapshot.id);
    await this.anchorRelocationService.relocate(workspace.id, target.id, snapshot);
  }

  /** Copies what the target compares into the store: two branch tips, or a branch and its uncommitted work. */
  private async readHeads(
    workspace: iWorkspaceRecord,
    target: iReviewTargetRecord,
  ): Promise<{ heads: iSnapshotHeads; workingFingerprint: string | null }> {
    if (target.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST) {
      return { heads: await this.remoteChangesService.fetchHeads(workspace, target), workingFingerprint: null };
    }
    if (target.kind !== REVIEW_TARGET_KINDS.WORKING_CHANGES) {
      const heads = await this.snapshotStoreService.fetchHeads(workspace, target.branch, target.parentBranch);
      return { heads, workingFingerprint: null };
    }
    const worktreePath = (await this.snapshotStoreService.listWorktrees(workspace.repoPath)).get(target.branch);
    if (!worktreePath) throw ORPCBadRequestError(errorCodes.BRANCH_NOT_CHECKED_OUT);
    // Taken first, so edits made while the snapshot is being built still show up as new.
    const workingFingerprint = (await this.snapshotStoreService.workingFingerprint(worktreePath)) ?? '';
    const heads = await this.snapshotStoreService.captureWorkingChanges(workspace, target.branch, worktreePath);
    return { heads, workingFingerprint };
  }

  private async isUnchanged(workspace: iWorkspaceRecord, target: iReviewTargetRecord, latest: iSnapshotRecord) {
    if (latest.parentBranch !== target.parentBranch) return false;
    if (target.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST)
      return this.remoteChangesService.isUnchanged(target, latest);
    if (target.kind === REVIEW_TARGET_KINDS.WORKING_CHANGES) {
      const branchSha = await this.snapshotStoreService.resolveBranch(workspace.repoPath, target.branch);
      return (
        branchSha === latest.parentHeadSha &&
        !(await this.hasNewWorkingChanges(workspace.repoPath, target.branch, latest))
      );
    }
    const heads = await this.snapshotStoreService.fetchHeads(workspace, target.branch, target.parentBranch);
    return latest.headSha === heads.headSha && latest.parentHeadSha === heads.parentHeadSha;
  }

  private async hasNewWorkingChanges(repoPath: string, branch: string, snapshot: iSnapshotRecord) {
    const worktreePath = (await this.snapshotStoreService.listWorktrees(repoPath)).get(branch);
    if (!worktreePath) return false;
    const fingerprint = (await this.snapshotStoreService.workingFingerprint(worktreePath)) ?? '';
    return fingerprint !== (snapshot.workingFingerprint ?? '');
  }

  private async toSummary(snapshot: iSnapshotRecord): Promise<iSnapshotSummary> {
    const { id, version, headSha, fileCount, additions, deletions, regionCount, unitCount, createdAt } = snapshot;
    const [markCounts, accountedRegionCount] = await Promise.all([
      this.unitMarkRepository.countByMark(id),
      this.unitMarkRepository.countAccountedRegions(id),
    ]);
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
      accountedRegionCount,
      laterUnitCount: markCounts.get(UNIT_MARKS.LATER) ?? 0,
      markCounts: [...markCounts].map(([mark, count]) => ({ mark, count })),
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

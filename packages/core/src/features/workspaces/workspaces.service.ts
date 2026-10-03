import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { REVIEW_TARGET_REPOSITORY_TOKEN, WORKSPACE_REPOSITORY_TOKEN } from '@~/di/tokens';
import { GitService } from '@~/features/git/git.service';
import type { iReviewTargetRepository } from '@~/features/reviews/review-targets/review-target.repository';
import { SnapshotStoreService } from '@~/features/reviews/snapshots/snapshot-store.service';
import { mapWithConcurrency } from '@~/lib/concurrency';
import { isDirectory, pathExists } from '@~/lib/file-system';
import { ORPCBadRequestError, ORPCNotFoundError, ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import { BranchesService } from './branches.service';
import type { iWorkspaceRepository } from './workspace.repository';
import type { iBranchResponse, iGitBranch, iWorkspaceRecord, iWorkspaceResponse } from './workspaces.types';

const DEFAULT_BRANCH_CANDIDATES = ['main', 'master', 'trunk', 'develop'];
const STATUS_CONCURRENCY = 4;

@singleton()
export class WorkspacesService {
  constructor(
    @inject(WORKSPACE_REPOSITORY_TOKEN) private readonly workspaceRepository: iWorkspaceRepository,
    private readonly gitService: GitService,
    private readonly branchesService: BranchesService,
    private readonly snapshotStoreService: SnapshotStoreService,
    @inject(REVIEW_TARGET_REPOSITORY_TOKEN) private readonly reviewTargetRepository: iReviewTargetRepository,
  ) {}

  public async list(): Promise<iWorkspaceResponse[]> {
    const records = await this.workspaceRepository.list();
    return Promise.all(records.map(async (record) => this.toResponse(record)));
  }

  public async getRecord(workspaceId: string) {
    const record = await this.workspaceRepository.findById(workspaceId);
    if (!record) throw ORPCNotFoundError(errorCodes.WORKSPACE_NOT_FOUND);
    return record;
  }

  /** Adds the repository containing `directory`; its top level is what gets stored. */
  public async add(directory: string): Promise<iWorkspaceResponse> {
    const absoluteDirectory = path.resolve(directory);
    if (!(await isDirectory(absoluteDirectory))) throw ORPCBadRequestError(errorCodes.DIRECTORY_NOT_FOUND);

    const repoPath = await this.resolveRepositoryRoot(absoluteDirectory);
    if (await this.workspaceRepository.findByRepoPath(repoPath)) {
      throw ORPCUnprocessableContentError(errorCodes.WORKSPACE_ALREADY_ADDED);
    }

    const record = await this.workspaceRepository.create({
      name: path.basename(repoPath),
      repoPath,
      defaultBranch: await this.detectDefaultBranch(repoPath),
    });
    return this.toResponse(record);
  }

  public async remove(workspaceId: string) {
    const isDeleted = await this.workspaceRepository.delete(workspaceId);
    if (!isDeleted) throw ORPCNotFoundError(errorCodes.WORKSPACE_NOT_FOUND);
    await this.snapshotStoreService.removeStore(workspaceId);
    return { workspaceId };
  }

  /** Local branches with the parent each is reviewed against and whether it has uncommitted work. */
  public async listBranches(workspaceId: string): Promise<iBranchResponse[]> {
    const record = await this.getRecord(workspaceId);
    const [branches, targets, worktrees] = await Promise.all([
      this.branchesService.listBranches(
        record.repoPath,
        record.defaultBranch,
        new Map(record.knownParents.map(({ branch, parent }) => [branch, parent])),
      ),
      this.reviewTargetRepository.list(workspaceId),
      this.snapshotStoreService.listWorktrees(record.repoPath),
    ]);
    const confirmedParents = new Map(
      targets
        .filter((target) => target.kind === REVIEW_TARGET_KINDS.BRANCH)
        .map((target) => [target.branch, target.parentBranch]),
    );
    await this.rememberParents(record, branches);
    return mapWithConcurrency(branches, STATUS_CONCURRENCY, async (branch) => {
      const confirmedParent = confirmedParents.get(branch.name);
      const parent = confirmedParent ?? branch.suggestedParent;
      const worktreePath = worktrees.get(branch.name);
      const hasWorkingChanges = worktreePath
        ? (await this.snapshotStoreService.workingFingerprint(worktreePath).catch(() => undefined)) !== undefined
        : false;
      return {
        ...branch,
        parent,
        isParentConfirmed: confirmedParent !== undefined,
        isParentMoved:
          parent !== undefined &&
          parent !== record.defaultBranch &&
          !(await this.contains(record.repoPath, branch, parent)),
        worktreePath,
        hasWorkingChanges,
      };
    });
  }

  private async rememberParents(record: iWorkspaceRecord, branches: readonly iGitBranch[]) {
    const knownParents = branches.flatMap((branch) =>
      branch.suggestedParent ? [{ branch: branch.name, parent: branch.suggestedParent }] : [],
    );
    if (JSON.stringify(knownParents) === JSON.stringify(record.knownParents)) return;
    await this.workspaceRepository.updateKnownParents(record.id, knownParents);
  }

  /** Whether the branch has every commit of its parent. A parent that no longer exists counts as contained. */
  private async contains(repoPath: string, branch: iGitBranch, parent: string) {
    const { exitCode } = await this.gitService.run(
      repoPath,
      ['merge-base', '--is-ancestor', `refs/heads/${parent}`, branch.headSha],
      { allowFailure: true },
    );
    return exitCode !== 1;
  }

  private async toResponse(record: iWorkspaceRecord): Promise<iWorkspaceResponse> {
    const { updatedAt: _updatedAt, knownParents: _knownParents, ...rest } = record;
    return { ...rest, isAvailable: await pathExists(path.join(record.repoPath, '.git')) };
  }

  private async resolveRepositoryRoot(directory: string) {
    const { stdout, exitCode } = await this.gitService.run(directory, ['rev-parse', '--show-toplevel'], {
      allowFailure: true,
    });
    const topLevel = stdout.trim();
    if (exitCode !== 0 || topLevel.length === 0) throw ORPCBadRequestError(errorCodes.NOT_A_GIT_REPOSITORY);
    return realpath(path.resolve(topLevel));
  }

  private async detectDefaultBranch(repoPath: string) {
    const remoteHead = await this.gitService.run(
      repoPath,
      ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'],
      { allowFailure: true },
    );
    const remoteDefault = remoteHead.stdout.trim().replace(/^origin\//, '');
    if (remoteHead.exitCode === 0 && remoteDefault && (await this.hasLocalBranch(repoPath, remoteDefault))) {
      return remoteDefault;
    }

    for (const candidate of DEFAULT_BRANCH_CANDIDATES) {
      if (await this.hasLocalBranch(repoPath, candidate)) return candidate;
    }

    const current = await this.gitService.run(repoPath, ['symbolic-ref', '--quiet', '--short', 'HEAD'], {
      allowFailure: true,
    });
    return current.exitCode === 0 ? current.stdout.trim() || undefined : undefined;
  }

  private async hasLocalBranch(repoPath: string, branch: string) {
    const { exitCode } = await this.gitService.run(
      repoPath,
      ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
      { allowFailure: true },
    );
    return exitCode === 0;
  }
}

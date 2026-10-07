import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { inject, singleton } from 'tsyringe';

import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { REVIEW_TARGET_REPOSITORY_TOKEN } from '@~/di/tokens';
import { GitService } from '@~/features/git/git.service';
import type { iReviewTargetRepository } from '@~/features/reviews/review-targets/review-target.repository';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';

import { AgentAccessError } from './agent-access.error';
import type { iAgentPlace, iAgentScope } from './mcp.types';

/** Kinds of review a branch can have, in the order an agent's branch is looked up. */
const BRANCH_REVIEW_KINDS = [REVIEW_TARGET_KINDS.BRANCH, REVIEW_TARGET_KINDS.CHANGE_REQUEST];

/**
 * Finds the review an agent is working on: the repository Chaff knows for its folder (a linked worktree
 * counts as its repository), the branch checked out there, and that branch's review. Git is only read.
 */
@singleton()
export class AgentScopeService {
  constructor(
    @inject(REVIEW_TARGET_REPOSITORY_TOKEN) private readonly reviewTargetRepository: iReviewTargetRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly gitService: GitService,
  ) {}

  public async resolve({ folder, repo, branch, targetId }: iAgentPlace): Promise<iAgentScope> {
    if (targetId) return this.pinnedScope(targetId);
    const directory = path.resolve(folder, repo ?? '.');
    const repoPath = await this.repositoryRoot(directory);
    const workspace = (await this.workspacesService.list()).find((candidate) => candidate.repoPath === repoPath);
    if (!workspace) {
      throw new AgentAccessError(`Chaff has no repository at ${repoPath}. Add it in Chaff and start a review first.`);
    }
    const reviewedBranch = branch ?? (await this.currentBranch(directory));
    for (const kind of BRANCH_REVIEW_KINDS) {
      const target = await this.reviewTargetRepository.findByBranch(workspace.id, reviewedBranch, kind);
      if (target) return { workspace, branch: reviewedBranch, target };
    }
    throw new AgentAccessError(`There is no review of ${reviewedBranch} in Chaff. Start one in Chaff first.`);
  }

  /** The review a session Chaff started is pinned to, whatever folder it runs in. */
  private async pinnedScope(targetId: string): Promise<iAgentScope> {
    const target = await this.reviewTargetRepository.findById(targetId);
    const workspace = target
      ? (await this.workspacesService.list()).find((candidate) => candidate.id === target.workspaceId)
      : undefined;
    if (!target || !workspace) throw new AgentAccessError('The review this run was started for no longer exists.');
    return { workspace, branch: target.branch, target };
  }

  /** The main working tree of the repository the directory belongs to. */
  private async repositoryRoot(directory: string) {
    const { stdout, exitCode } = await this.gitService.run(
      directory,
      ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      { allowFailure: true },
    );
    const commonDir = stdout.trim();
    if (exitCode !== 0 || commonDir.length === 0)
      throw new AgentAccessError(`${directory} is not in a git repository.`);
    return realpath(path.basename(commonDir) === '.git' ? path.dirname(commonDir) : commonDir);
  }

  private async currentBranch(directory: string) {
    const { stdout, exitCode } = await this.gitService.run(directory, ['symbolic-ref', '--quiet', '--short', 'HEAD'], {
      allowFailure: true,
    });
    const branch = stdout.trim();
    if (exitCode !== 0 || branch.length === 0) {
      throw new AgentAccessError('No branch is checked out here. Pass the branch to review.');
    }
    return branch;
  }
}

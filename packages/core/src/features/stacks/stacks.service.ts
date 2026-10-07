import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';
import { STACK_ENDS } from '@chaff/common/enums/stack.enums';

import { REVIEW_TARGET_REPOSITORY_TOKEN, STACK_REPOSITORY_TOKEN } from '@~/di/tokens';
import { OpenChangesService } from '@~/features/code-hosts/open-changes.service';
import type { iOpenChanges } from '@~/features/code-hosts/open-changes.service';
import { BranchRefsService } from '@~/features/git/branch-refs.service';
import type { iReviewTargetRepository } from '@~/features/reviews/review-targets/review-target.repository';
import { BranchesService } from '@~/features/workspaces/branches.service';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import type { iBranchLink, iWorkspaceRecord } from '@~/features/workspaces/workspaces.types';
import { ORPCBadRequestError, ORPCNotFoundError, ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import type { iStackRepository } from './stack.repository';
import type {
  iAddStackBranchInput,
  iImportStackInput,
  iStackBranchInput,
  iStackMemberRecord,
  iStackRecord,
  iStackResponse,
} from './stacks.types';

/**
 * Stacks the user builds by hand: chains of branches, each merging into the one below it and the bottom one into
 * the base. A branch belongs to one stack of its repository at most, and the default branch to none. Every change
 * to a stack moves the branch reviews of its branches onto their new parents.
 */
@singleton()
export class StacksService {
  constructor(
    @inject(STACK_REPOSITORY_TOKEN) private readonly stackRepository: iStackRepository,
    @inject(REVIEW_TARGET_REPOSITORY_TOKEN) private readonly reviewTargetRepository: iReviewTargetRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly branchesService: BranchesService,
    private readonly branchRefsService: BranchRefsService,
    private readonly openChangesService: OpenChangesService,
  ) {}

  public async list(workspaceId: string) {
    const workspace = await this.workspacesService.getRecord(workspaceId);
    const [records, openChanges] = await Promise.all([
      this.stackRepository.list(workspaceId),
      this.openChangesService.forWorkspace(workspace),
    ]);
    return Promise.all(records.map(async (record) => this.toResponse(workspace, record, openChanges)));
  }

  public async create({ workspaceId, branch }: { workspaceId: string; branch: string }) {
    const workspace = await this.workspacesService.getRecord(workspaceId);
    await this.assertStackable(workspace, branch);
    return this.respond(workspace, await this.stackRepository.create(workspace.id, { branches: [{ branch }] }));
  }

  /** A chain read from the host; its branches may not be fetched yet, so they are not looked up in the repository. */
  public async import({ workspaceId, branches, baseBranch }: iImportStackInput) {
    const workspace = await this.workspacesService.getRecord(workspaceId);
    if (branches.includes(baseBranch)) throw ORPCBadRequestError(errorCodes.INVALID_STACK_BASE);
    if (new Set(branches).size !== branches.length) throw ORPCBadRequestError(errorCodes.BRANCH_ALREADY_STACKED);
    for (const branch of branches) await this.assertFree(workspace, branch);
    const record = await this.stackRepository.create(workspace.id, {
      baseBranch,
      branches: branches.map((branch) => ({ branch })),
    });
    await this.moveReviews(record);
    return this.respond(workspace, record);
  }

  public async addBranch({ stackId, branch, end }: iAddStackBranchInput) {
    const stack = await this.getStack(stackId);
    const workspace = await this.workspacesService.getRecord(stack.workspaceId);
    if (branch === stack.baseBranch) throw ORPCBadRequestError(errorCodes.INVALID_STACK_BASE);
    await this.assertStackable(workspace, branch);
    const branches = end === STACK_ENDS.TOP ? [...stack.branches, { branch }] : [{ branch }, ...stack.branches];
    return this.rewrite(workspace, stack, { branches });
  }

  /** The branch above the removed one then merges into the one below it; the last branch takes the stack along. */
  public async removeBranch({ stackId, branch }: iStackBranchInput) {
    const stack = await this.getStack(stackId);
    this.assertMember(stack, branch);
    const branches = stack.branches.filter((member) => member.branch !== branch);
    if (branches.length === 0) {
      await this.stackRepository.delete(stack.id);
      return null;
    }
    return this.rewrite(await this.workspacesService.getRecord(stack.workspaceId), stack, { branches });
  }

  public async setBase({ stackId, baseBranch }: { stackId: string; baseBranch: string | null }) {
    const stack = await this.getStack(stackId);
    const workspace = await this.workspacesService.getRecord(stack.workspaceId);
    if (baseBranch !== null) {
      if (stack.branches.some((member) => member.branch === baseBranch)) {
        throw ORPCBadRequestError(errorCodes.INVALID_STACK_BASE);
      }
      await this.assertExists(workspace, baseBranch);
    }
    return this.rewrite(workspace, stack, { branches: stack.branches, baseBranch });
  }

  public async setHidden({ stackId, isHidden }: { stackId: string; isHidden: boolean }) {
    const stack = await this.getStack(stackId);
    const record = await this.stackRepository.update(stack.id, { isHidden });
    return this.respond(await this.workspacesService.getRecord(stack.workspaceId), record ?? stack);
  }

  public async remove(stackId: string) {
    const isDeleted = await this.stackRepository.delete(stackId);
    if (!isDeleted) throw ORPCNotFoundError(errorCodes.STACK_NOT_FOUND);
    return { stackId };
  }

  public async getStack(stackId: string) {
    const stack = await this.stackRepository.findById(stackId);
    if (!stack) throw ORPCNotFoundError(errorCodes.STACK_NOT_FOUND);
    return stack;
  }

  /** Saves the stack's branches, and its base when given, then moves the reviews of its branches to match. */
  public async rewrite(
    workspace: iWorkspaceRecord,
    stack: iStackRecord,
    { branches, baseBranch }: { branches: readonly iStackMemberRecord[]; baseBranch?: string | null },
  ) {
    if (baseBranch !== undefined) await this.stackRepository.update(stack.id, { baseBranch });
    const record = await this.stackRepository.replaceBranches(stack.id, branches);
    if (!record) throw ORPCNotFoundError(errorCodes.STACK_NOT_FOUND);
    await this.moveReviews(record);
    return this.respond(workspace, record);
  }

  public async respond(workspace: iWorkspaceRecord, record: iStackRecord) {
    return this.toResponse(workspace, record, await this.openChangesService.forWorkspace(workspace));
  }

  public assertMember(stack: iStackRecord, branch: string) {
    if (!stack.branches.some((member) => member.branch === branch)) {
      throw ORPCBadRequestError(errorCodes.BRANCH_NOT_IN_STACK);
    }
  }

  /** Each branch with the branch it merges into: the one below it, or the base for the bottom branch. */
  public links(stack: Pick<iStackRecord, 'branches' | 'baseBranch'>): iBranchLink[] {
    return stack.branches.map((member, index) => ({
      branch: member.branch,
      parent: index === 0 ? stack.baseBranch : stack.branches[index - 1]?.branch,
    }));
  }

  private async toResponse(
    workspace: iWorkspaceRecord,
    record: iStackRecord,
    openChanges: iOpenChanges,
  ): Promise<iStackResponse> {
    const links = this.links(record);
    const statuses = await this.branchesService.describeLinks(workspace.repoPath, links, workspace.defaultBranch);
    const changes = new Map(openChanges.changes.map((change) => [change.sourceBranch, change]));
    const { dismissedChanges: _dismissedChanges, branches: _branches, ...stack } = record;
    return {
      ...stack,
      remote: openChanges.remote,
      branches: links.map((link, index) => ({
        commitsAhead: statuses[index]?.commitsAhead ?? 0,
        isParentMoved: statuses[index]?.isParentMoved ?? false,
        isMissing: statuses[index]?.isMissing ?? true,
        branch: link.branch,
        parentBranch: link.parent,
        change: changes.get(link.branch),
      })),
    };
  }

  /** Points the branch review of every branch of the stack at the branch it now merges into. */
  private async moveReviews(stack: iStackRecord) {
    const targets = await this.reviewTargetRepository.list(stack.workspaceId);
    for (const { branch, parent } of this.links(stack)) {
      const target = targets.find(
        (candidate) => candidate.branch === branch && candidate.kind === REVIEW_TARGET_KINDS.BRANCH,
      );
      if (target && parent && target.parentBranch !== parent) {
        await this.reviewTargetRepository.updateParent(target.id, parent);
      }
    }
  }

  private async assertStackable(workspace: iWorkspaceRecord, branch: string) {
    await this.assertFree(workspace, branch);
    await this.assertExists(workspace, branch);
  }

  private async assertFree(workspace: iWorkspaceRecord, branch: string) {
    if (branch === workspace.defaultBranch) {
      throw ORPCUnprocessableContentError(errorCodes.DEFAULT_BRANCH_NOT_STACKABLE);
    }
    if (await this.stackRepository.findByBranch(workspace.id, branch)) {
      throw ORPCUnprocessableContentError(errorCodes.BRANCH_ALREADY_STACKED, { branch });
    }
  }

  private async assertExists(workspace: iWorkspaceRecord, branch: string) {
    if (!(await this.branchRefsService.resolve(workspace.repoPath, branch))) {
      throw ORPCNotFoundError(errorCodes.BRANCH_NOT_FOUND, { branch });
    }
  }
}

import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { STACK_HOST_CHANGE_KINDS } from '@chaff/common/enums/stack.enums';

import { STACK_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iRemoteChange } from '@~/features/code-hosts/code-hosts.types';
import { OpenChangesService } from '@~/features/code-hosts/open-changes.service';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import { ORPCBadRequestError, ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import type { iStackRepository } from './stack.repository';
import { StacksService } from './stacks.service';
import type { iStackBranchInput, iStackHostChange, iStackImport } from './stacks.types';

/** Chains of open changes listed for import, at most. */
const MAX_IMPORT_CHAINS = 50;

/**
 * Stacks and the code host's open changes: chains of changes to import as stacks, and where the host differs
 * from a stack, which the user applies or sets aside one change at a time. The host is never written to.
 */
@singleton()
export class StackHostService {
  constructor(
    @inject(STACK_REPOSITORY_TOKEN) private readonly stackRepository: iStackRepository,
    private readonly stacksService: StacksService,
    private readonly workspacesService: WorkspacesService,
    private readonly openChangesService: OpenChangesService,
  ) {}

  /**
   * Every chain of open changes, each targeting the one below it, from a change whose target is no change's
   * source up to a change no other targets. Chains that split are listed once per top change.
   */
  public async importable(workspaceId: string): Promise<iStackImport[]> {
    const workspace = await this.workspacesService.getRecord(workspaceId);
    const [{ changes }, stacks] = await Promise.all([
      this.openChangesService.forWorkspace(workspace),
      this.stackRepository.list(workspace.id),
    ]);
    const stackOf = new Map(stacks.flatMap((stack) => stack.branches.map((member) => [member.branch, stack.id])));
    const sources = new Set(changes.map((change) => change.sourceBranch));
    const chains = changes
      .filter((change) => !sources.has(change.targetBranch))
      .flatMap((bottom) => this.chainsFrom(bottom, changes, new Set([bottom.targetBranch])));
    return chains
      .sort((left, right) => this.lastUpdate(right) - this.lastUpdate(left))
      .slice(0, MAX_IMPORT_CHAINS)
      .map((chain) => ({
        baseBranch: chain[0]?.targetBranch ?? '',
        branches: chain.map((change) => ({ branch: change.sourceBranch, change })),
        stackedBranches: chain.flatMap((change) => {
          const stackId = stackOf.get(change.sourceBranch);
          return stackId ? [{ branch: change.sourceBranch, stackId }] : [];
        }),
      }));
  }

  /** Open changes targeting the top branch, and branches whose change targets another branch than in the stack. */
  public async hostChanges(stackId: string): Promise<iStackHostChange[]> {
    const stack = await this.stacksService.getStack(stackId);
    const workspace = await this.workspacesService.getRecord(stack.workspaceId);
    const [{ changes }, stacks] = await Promise.all([
      this.openChangesService.forWorkspace(workspace),
      this.stackRepository.list(workspace.id),
    ]);
    const stacked = new Set(stacks.flatMap((other) => other.branches.map((member) => member.branch)));
    const dismissed = new Set(stack.dismissedChanges);
    const top = stack.branches.at(-1)?.branch;
    const added = changes
      .filter(
        (change) => change.targetBranch === top && !dismissed.has(change.number) && !stacked.has(change.sourceBranch),
      )
      .map((change) => ({ kind: STACK_HOST_CHANGE_KINDS.ADDED_ON_TOP, branch: change.sourceBranch, change }));
    const bySource = new Map(changes.map((change) => [change.sourceBranch, change]));
    const retargeted = this.stacksService.links(stack).flatMap(({ branch, parent }, index) => {
      const change = bySource.get(branch);
      const isKept = stack.branches[index]?.keptHostParent === change?.targetBranch;
      if (!change || !parent || change.targetBranch === parent || isKept) return [];
      return [{ kind: STACK_HOST_CHANGE_KINDS.RETARGETED, branch, change, stackParent: parent }];
    });
    return [...added, ...retargeted];
  }

  /**
   * The branch merges into its change's target: the branches between them leave the stack, or, when the target is
   * not in the stack, every branch below leaves and the target becomes the base.
   */
  public async followHostParent({ stackId, branch }: iStackBranchInput) {
    const { stack, workspace, change } = await this.locate(stackId, branch);
    const index = stack.branches.findIndex((member) => member.branch === branch);
    const targetIndex = stack.branches.findIndex((member) => member.branch === change.targetBranch);
    if (targetIndex > index) throw ORPCBadRequestError(errorCodes.INVALID_STACK_BASE);
    const own = { branch, keptHostParent: undefined };
    if (targetIndex !== -1) {
      return this.stacksService.rewrite(workspace, stack, {
        branches: [...stack.branches.slice(0, targetIndex + 1), own, ...stack.branches.slice(index + 1)],
      });
    }
    return this.stacksService.rewrite(workspace, stack, {
      branches: [own, ...stack.branches.slice(index + 1)],
      baseBranch: change.targetBranch,
    });
  }

  /** Keeps the branch's parent and stops reporting its change's target until the change is retargeted again. */
  public async keepParent({ stackId, branch }: iStackBranchInput) {
    const { stack, workspace, change } = await this.locate(stackId, branch);
    return this.stacksService.rewrite(workspace, stack, {
      branches: stack.branches.map((member) =>
        member.branch === branch ? { ...member, keptHostParent: change.targetBranch } : member,
      ),
    });
  }

  public async dismissChange({ stackId, changeNumber }: { stackId: string; changeNumber: number }) {
    const stack = await this.stacksService.getStack(stackId);
    const dismissedChanges = [...new Set([...stack.dismissedChanges, changeNumber])];
    const record = await this.stackRepository.update(stack.id, { dismissedChanges });
    return this.stacksService.respond(await this.workspacesService.getRecord(stack.workspaceId), record ?? stack);
  }

  private async locate(stackId: string, branch: string) {
    const stack = await this.stacksService.getStack(stackId);
    this.stacksService.assertMember(stack, branch);
    const workspace = await this.workspacesService.getRecord(stack.workspaceId);
    const { changes } = await this.openChangesService.forWorkspace(workspace);
    const change = changes.find((candidate) => candidate.sourceBranch === branch);
    if (!change) throw ORPCNotFoundError(errorCodes.CHANGE_REQUEST_NOT_FOUND);
    return { stack, workspace, change };
  }

  /** Every path up from the change through the changes targeting it; `visited` keeps a cycle from looping. */
  private chainsFrom(
    change: iRemoteChange,
    changes: readonly iRemoteChange[],
    visited: ReadonlySet<string>,
  ): iRemoteChange[][] {
    const seen = new Set([...visited, change.sourceBranch]);
    const above = changes.filter(
      (candidate) => candidate.targetBranch === change.sourceBranch && !seen.has(candidate.sourceBranch),
    );
    if (above.length === 0) return [[change]];
    return above.flatMap((next) => this.chainsFrom(next, changes, seen).map((chain) => [change, ...chain]));
  }

  private lastUpdate(chain: readonly iRemoteChange[]) {
    return Math.max(...chain.map((change) => change.updatedAt.getTime()));
  }
}

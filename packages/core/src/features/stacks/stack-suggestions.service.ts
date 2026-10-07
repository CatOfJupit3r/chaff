import { inject, singleton } from 'tsyringe';

import { STACK_ENDS, STACK_SUGGESTION_SOURCES } from '@chaff/common/enums/stack.enums';

import { STACK_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iRemoteChange } from '@~/features/code-hosts/code-hosts.types';
import { OpenChangesService } from '@~/features/code-hosts/open-changes.service';
import { BranchesService } from '@~/features/workspaces/branches.service';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import type { iNearbyBranch, iWorkspaceRecord } from '@~/features/workspaces/workspaces.types';

import type { iStackRepository } from './stack.repository';
import { StacksService } from './stacks.service';
import type { iAddStackBranchInput, iStackRecord, iStackSuggestion } from './stacks.types';

/** Branches read from the history, at most, for one end of a stack. */
const HISTORY_SUGGESTION_LIMIT = 4;
/** Steps of a chain of changes followed from one end of a stack, at most. */
const MAX_CHAIN_STEPS = 10;

interface iSuggestionContext {
  workspace: iWorkspaceRecord;
  stack: iStackRecord;
  members: ReadonlySet<string>;
  changes: readonly iRemoteChange[];
}

/**
 * What could go next on one end of a stack. The host's open changes come first, as a chain: below the bottom
 * branch, the target of its change, then that branch's target, down to the default branch; above the top one,
 * the changes that target it, followed upward while each step has a single change. The nearest branches in the
 * history follow. Branches of other stacks are suggested too, marked with their stack, as they cannot be added.
 */
@singleton()
export class StackSuggestionsService {
  constructor(
    @inject(STACK_REPOSITORY_TOKEN) private readonly stackRepository: iStackRepository,
    private readonly stacksService: StacksService,
    private readonly workspacesService: WorkspacesService,
    private readonly branchesService: BranchesService,
    private readonly openChangesService: OpenChangesService,
  ) {}

  public async suggest({ stackId, end }: Omit<iAddStackBranchInput, 'branch'>): Promise<iStackSuggestion[]> {
    const stack = await this.stacksService.getStack(stackId);
    const workspace = await this.workspacesService.getRecord(stack.workspaceId);
    const [{ changes }, stacks] = await Promise.all([
      this.openChangesService.forWorkspace(workspace),
      this.stackRepository.list(workspace.id),
    ]);
    const context = { workspace, stack, members: new Set(stack.branches.map((member) => member.branch)), changes };
    const isTop = end === STACK_ENDS.TOP;
    const host = isTop ? this.hostAbove(context) : this.hostBelow(context);
    const history = await this.history(context, isTop);
    const stackOf = new Map(stacks.flatMap((other) => other.branches.map((member) => [member.branch, other.id])));
    const hosted = new Set(host.filter((suggestion) => suggestion.step === 0).map((suggestion) => suggestion.branch));
    const bySource = new Map(changes.map((change) => [change.sourceBranch, change]));
    return [
      ...host,
      ...history
        .filter((nearby) => !hosted.has(nearby.name))
        .map((nearby) => ({
          branch: nearby.name,
          source: STACK_SUGGESTION_SOURCES.HISTORY,
          isBase: nearby.name === workspace.defaultBranch,
          step: 0,
          change: bySource.get(nearby.name),
          commitsApart: nearby.commitsApart,
        })),
    ].map((suggestion) => ({ ...suggestion, stackId: suggestion.isBase ? undefined : stackOf.get(suggestion.branch) }));
  }

  /** The chain of change targets below the bottom branch, stopping at the stack's base or the default branch. */
  private hostBelow({ workspace, stack, members, changes }: iSuggestionContext): iStackSuggestion[] {
    const bySource = new Map(changes.map((change) => [change.sourceBranch, change]));
    const chain: iStackSuggestion[] = [];
    let current: string | undefined = stack.branches[0]?.branch;
    for (let step = 0; current && step < MAX_CHAIN_STEPS; step += 1) {
      const link = bySource.get(current);
      const target = link?.targetBranch;
      if (!link || !target || members.has(target) || target === stack.baseBranch) break;
      const isBase = target === workspace.defaultBranch;
      chain.push({
        branch: target,
        source: STACK_SUGGESTION_SOURCES.HOST,
        isBase,
        step,
        change: bySource.get(target),
        linkChange: link,
      });
      current = isBase ? undefined : target;
    }
    return chain;
  }

  /** The changes targeting the top branch, then, while only one targets each, the chain above them. */
  private hostAbove({ stack, members, changes }: iSuggestionContext): iStackSuggestion[] {
    const above = (branch: string) =>
      changes.filter((change) => change.targetBranch === branch && !members.has(change.sourceBranch));
    const toSuggestion = (change: iRemoteChange, step: number) => ({
      branch: change.sourceBranch,
      source: STACK_SUGGESTION_SOURCES.HOST,
      isBase: false,
      step,
      change,
      linkChange: change,
    });
    const top = stack.branches.at(-1)?.branch;
    const first = top ? above(top) : [];
    const chain: iStackSuggestion[] = first.map((change) => toSuggestion(change, 0));
    let next = first.length === 1 ? first[0] : undefined;
    for (let step = 1; next && step < MAX_CHAIN_STEPS; step += 1) {
      const followers = above(next.sourceBranch).filter(
        (change) => !chain.some((suggestion) => suggestion.branch === change.sourceBranch),
      );
      next = followers.length === 1 ? followers[0] : undefined;
      if (next) chain.push(toSuggestion(next, step));
    }
    return chain;
  }

  private async history({ workspace, stack, members }: iSuggestionContext, isTop: boolean): Promise<iNearbyBranch[]> {
    const edge = isTop ? stack.branches.at(-1)?.branch : stack.branches[0]?.branch;
    if (!edge) return [];
    const options = { defaultBranch: workspace.defaultBranch, limit: HISTORY_SUGGESTION_LIMIT + members.size };
    const nearby = isTop
      ? await this.branchesService.branchesAbove(workspace.repoPath, edge, options)
      : await this.branchesService.branchesBelow(workspace.repoPath, edge, options);
    const usable = nearby.filter((candidate) => !members.has(candidate.name) && candidate.name !== stack.baseBranch);
    const defaultBranch = usable.find((candidate) => candidate.name === workspace.defaultBranch);
    const nearest = usable.filter((candidate) => candidate !== defaultBranch).slice(0, HISTORY_SUGGESTION_LIMIT);
    return defaultBranch ? [...nearest, defaultBranch] : nearest;
  }
}

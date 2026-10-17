import { inject, singleton } from 'tsyringe';

import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';
import { parseReviewLink } from '@chaff/common/helpers/review-link.helper';

import { REVIEW_TARGET_REPOSITORY_TOKEN } from '@~/di/tokens';
import { ChangeRequestsService } from '@~/features/code-hosts/change-requests.service';
import { RemoteProjectsService } from '@~/features/code-hosts/remote-projects.service';
import type { iReviewTargetRepository } from '@~/features/reviews/review-targets/review-target.repository';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import { StacksService } from '@~/features/stacks/stacks.service';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import type { iWorkspaceResponse } from '@~/features/workspaces/workspaces.types';

import { AgentAccessError } from './agent-access.error';
import { AgentScopeService } from './agent-scope.service';
import type { iAgentSession, iStartReviewArguments } from './mcp.types';

/**
 * Starts reviews for a coding agent the way the Overview's start box does: from a merge or pull request link,
 * a `!412` / `#412` number, or a branch name. A review that exists is continued, never started twice.
 */
@singleton()
export class AgentReviewsService {
  constructor(
    @inject(REVIEW_TARGET_REPOSITORY_TOKEN) private readonly reviewTargetRepository: iReviewTargetRepository,
    private readonly agentScopeService: AgentScopeService,
    private readonly workspacesService: WorkspacesService,
    private readonly remoteProjectsService: RemoteProjectsService,
    private readonly changeRequestsService: ChangeRequestsService,
    private readonly reviewsService: ReviewsService,
    private readonly stacksService: StacksService,
  ) {}

  public async start({ review, repo, parentBranch, ...session }: iStartReviewArguments) {
    const link = parseReviewLink(review);
    if (!link) {
      throw new AgentAccessError(`Chaff cannot read "${review}". Pass a merge request link, !412, #412 or a branch.`);
    }
    if (link.branch !== undefined) {
      const workspace = await this.agentScopeService.findOrAddWorkspace(session.folder, repo);
      return this.startBranch(workspace, link.branch, parentBranch);
    }
    const workspace = await this.workspaceForChange(session, repo, link.project);
    const existing = await this.reviewTargetRepository.findByChange(workspace.id, link.number);
    const opened = await this.changeRequestsService.start(workspace.id, link.number);
    return { ...(await this.reviewsService.getContext(opened.snapshotId)), workspace, isContinued: !!existing };
  }

  /** The branch's review: one that exists for it, else a new one onto the branch it merges into. */
  private async startBranch(workspace: iWorkspaceResponse, branch: string, parentBranch: string | undefined) {
    const existing =
      (await this.reviewTargetRepository.findByBranch(workspace.id, branch, REVIEW_TARGET_KINDS.BRANCH)) ??
      (await this.reviewTargetRepository.findByBranch(workspace.id, branch, REVIEW_TARGET_KINDS.CHANGE_REQUEST));
    const opened = existing
      ? await this.reviewsService.open(existing.id)
      : await this.reviewsService.start({
          workspaceId: workspace.id,
          branch,
          parentBranch: await this.stackParent(workspace, branch, parentBranch),
          kind: REVIEW_TARGET_KINDS.BRANCH,
        });
    return { ...(await this.reviewsService.getContext(opened.snapshotId)), workspace, isContinued: !!existing };
  }

  /**
   * What the branch merges into: the branch below it in its stack, else the parent given, which puts the branch
   * in a stack onto that parent as the start box does. Without either the agent is asked for the parent.
   */
  private async stackParent(workspace: iWorkspaceResponse, branch: string, parentBranch: string | undefined) {
    const stacks = await this.stacksService.list(workspace.id);
    const stack = stacks.find((candidate) => candidate.branches.some((member) => member.branch === branch));
    const stacked = stack?.branches.find((member) => member.branch === branch)?.parentBranch;
    if (stacked) {
      if (parentBranch !== undefined && parentBranch !== stacked) {
        throw new AgentAccessError(
          `${branch} merges into ${stacked} in its stack in Chaff. Leave parentBranch out, or change the stack in Chaff.`,
        );
      }
      return stacked;
    }
    if (parentBranch === undefined) {
      throw new AgentAccessError(
        `Chaff does not know what ${branch} merges into. Pass parentBranch (the repository's default branch is ${workspace.defaultBranch}).`,
      );
    }
    const stackId = stack?.id ?? (await this.stacksService.create({ workspaceId: workspace.id, branch })).id;
    await this.stacksService.setBase({ stackId, baseBranch: parentBranch });
    return parentBranch;
  }

  /**
   * The repository a change is reviewed in: the one at `repo` when given, else the one linked to the link's
   * project, else the repository of the agent's folder.
   */
  private async workspaceForChange(session: iAgentSession, repo: string | undefined, project: string | undefined) {
    if (repo !== undefined || project === undefined) {
      return this.agentScopeService.findOrAddWorkspace(session.folder, repo);
    }
    const linked = await this.workspacesLinkedTo(project);
    if (linked.length > 1) {
      throw new AgentAccessError(`Several repositories in Chaff are linked to ${project}. Pass repo to pick one.`);
    }
    const [workspace] = linked;
    if (workspace) return workspace;
    const fromFolder = await this.agentScopeService.findOrAddWorkspace(session.folder);
    if ((await this.workspacesLinkedTo(project, [fromFolder])).length === 0) {
      throw new AgentAccessError(
        `No repository in Chaff is linked to ${project}. Pass repo with the path of its clone, or link it in Chaff's Settings.`,
      );
    }
    return fromFolder;
  }

  private async workspacesLinkedTo(project: string, candidates?: iWorkspaceResponse[]) {
    const workspaces = candidates ?? (await this.workspacesService.list()).filter((workspace) => workspace.isAvailable);
    const wanted = project.toLowerCase();
    const remotes = await Promise.all(
      workspaces.map(async (workspace) => this.remoteProjectsService.describe(workspace.id)),
    );
    return workspaces.filter((_, index) => remotes[index]?.project.toLowerCase() === wanted);
  }
}

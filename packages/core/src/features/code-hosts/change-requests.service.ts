import { inject, singleton } from 'tsyringe';

import { INBOX_FILTERS } from '@chaff/common/enums/code-host.enums';
import type { InboxFilter } from '@chaff/common/enums/code-host.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { REVIEW_TARGET_REPOSITORY_TOKEN, WORKSPACE_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iReviewTargetRepository } from '@~/features/reviews/review-targets/review-target.repository';
import type { iChangeRequestFields } from '@~/features/reviews/review-targets/review-targets.types';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import type { iWorkspaceRepository } from '@~/features/workspaces/workspace.repository';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import { mapWithConcurrency } from '@~/lib/concurrency';
import {
  isORPCError,
  ORPCBadRequestError,
  ORPCNotFoundError,
  ORPCUnprocessableContentError,
} from '@~/lib/orpc-error-wrapper';

import type { iRemoteChange, iRemoteDiscussion, iWorkspaceRemote } from './code-hosts.types';
import { ConnectionsService } from './connections.service';
import { RemoteChangesService } from './remote-changes.service';
import { RemoteProjectsService } from './remote-projects.service';

const INBOX_CONCURRENCY = 4;
/** How long a change's discussions are reused before the host is asked again. */
const DISCUSSIONS_CACHE_MS = 60_000;

function isShown(change: iRemoteChange, filter: InboxFilter, username: string) {
  if (filter === INBOX_FILTERS.all) return true;
  if (filter === INBOX_FILTERS.authored) return change.authorUsername === username;
  return change.assigneeUsernames.includes(username) || change.reviewerUsernames.includes(username);
}

function changeFields(remote: iWorkspaceRemote, change: iRemoteChange): iChangeRequestFields {
  return {
    kind: REVIEW_TARGET_KINDS.CHANGE_REQUEST,
    parentBranch: change.targetBranch,
    codeHost: remote.connection.host,
    connectionId: remote.connection.id,
    remoteProject: remote.project,
    changeNumber: change.number,
    title: change.title,
    webUrl: change.webUrl,
  };
}

/**
 * GitLab merge requests and GitHub pull requests: the inbox, opening one for review, linking a local
 * branch's review to the change it became, and the change's discussions, shown read-only.
 */
@singleton()
export class ChangeRequestsService {
  private readonly discussionsCache = new Map<string, { at: number; discussions: iRemoteDiscussion[] }>();

  constructor(
    @inject(WORKSPACE_REPOSITORY_TOKEN) private readonly workspaceRepository: iWorkspaceRepository,
    @inject(REVIEW_TARGET_REPOSITORY_TOKEN) private readonly reviewTargetRepository: iReviewTargetRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly connectionsService: ConnectionsService,
    private readonly remoteProjectsService: RemoteProjectsService,
    private readonly remoteChangesService: RemoteChangesService,
    private readonly reviewsService: ReviewsService,
  ) {}

  /** Open changes of every repository with a linked project. A host that fails reports its error alone. */
  public async inbox(filter: InboxFilter) {
    const [workspaces, connections] = await Promise.all([
      this.workspaceRepository.list(),
      this.connectionsService.listRecords(),
    ]);
    if (connections.length === 0) return [];
    const projects = await mapWithConcurrency(workspaces, INBOX_CONCURRENCY, async (workspace) => {
      const remote = await this.remoteProjectsService.resolve(workspace, connections);
      if (!remote) return undefined;
      const base = {
        workspaceId: workspace.id,
        connectionId: remote.connection.id,
        host: remote.connection.host,
        project: remote.project,
      };
      try {
        const { provider, access } = await this.connectionsService.access(remote.connection);
        const changes = await provider.listChanges(access, remote.project);
        return {
          ...base,
          changes: changes.filter((change) => isShown(change, filter, remote.connection.username)),
          error: null,
        };
      } catch (error) {
        return { ...base, changes: [], error: isORPCError(error) ? error.message : 'Could not load changes' };
      }
    });
    return projects.filter((project) => project !== undefined);
  }

  /** Copies the change into the store and opens its newest snapshot, freezing one if it has none. */
  public async start(workspaceId: string, changeNumber: number) {
    const { remote, change } = await this.find(workspaceId, changeNumber);
    const fields = changeFields(remote, change);
    const existing = await this.reviewTargetRepository.findByChange(workspaceId, changeNumber);
    const target = existing
      ? await this.reviewTargetRepository.updateChange(existing.id, fields)
      : await this.reviewTargetRepository.create({ workspaceId, branch: change.sourceBranch, ...fields });
    if (!target) throw ORPCNotFoundError(errorCodes.REVIEW_TARGET_NOT_FOUND);
    return this.reviewsService.open(target.id);
  }

  /**
   * Moves a local branch's review onto the change it was pushed as. Snapshots, marks and findings stay
   * with the review; the next update reads the change from the host.
   */
  public async link(targetId: string, changeNumber: number) {
    const { target } = await this.reviewsService.getTargetContext(targetId);
    if (target.kind !== REVIEW_TARGET_KINDS.BRANCH) throw ORPCBadRequestError(errorCodes.CHANGE_REQUEST_ALREADY_LINKED);
    const { remote, change } = await this.find(target.workspaceId, changeNumber);
    if (await this.reviewTargetRepository.findByChange(target.workspaceId, changeNumber)) {
      throw ORPCUnprocessableContentError(errorCodes.CHANGE_REQUEST_ALREADY_LINKED);
    }
    const linked = await this.reviewTargetRepository.updateChange(target.id, changeFields(remote, change));
    if (!linked) throw ORPCNotFoundError(errorCodes.REVIEW_TARGET_NOT_FOUND);
    return { targetId: linked.id };
  }

  /** The change's threads, marked when they were written against a different commit than the snapshot. */
  public async discussions(snapshotId: string) {
    const { snapshot, target } = await this.reviewsService.getContext(snapshotId);
    if (target.kind !== REVIEW_TARGET_KINDS.CHANGE_REQUEST) return [];
    const cached = this.discussionsCache.get(target.id);
    let discussions = cached && Date.now() - cached.at < DISCUSSIONS_CACHE_MS ? cached.discussions : undefined;
    if (!discussions) {
      const { provider, access, project, changeNumber } = await this.remoteChangesService.locate(target);
      discussions = await provider.listDiscussions(access, project, changeNumber);
      this.discussionsCache.set(target.id, { at: Date.now(), discussions });
    }
    return discussions.map((discussion) => ({
      ...discussion,
      isOnSnapshot: discussion.commitSha === undefined || discussion.commitSha === snapshot.headSha,
    }));
  }

  private async find(workspaceId: string, changeNumber: number) {
    const workspace = await this.workspacesService.getRecord(workspaceId);
    const remote = await this.remoteProjectsService.resolve(workspace);
    if (!remote) throw ORPCNotFoundError(errorCodes.REMOTE_PROJECT_NOT_FOUND);
    const { provider, access } = await this.connectionsService.access(remote.connection);
    const change = await provider.getChange(access, remote.project, changeNumber);
    if (!change) throw ORPCNotFoundError(errorCodes.CHANGE_REQUEST_NOT_FOUND);
    return { remote, change };
  }
}

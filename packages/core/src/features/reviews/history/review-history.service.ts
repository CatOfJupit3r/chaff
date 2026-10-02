import { inject, singleton } from 'tsyringe';

import { IS_ACTIVE_FINDING_STATUS, REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { FINDING_REPOSITORY_TOKEN, REVIEW_TARGET_REPOSITORY_TOKEN, UNIT_MARK_REPOSITORY_TOKEN } from '@~/di/tokens';
import { RemoteChangesService } from '@~/features/code-hosts/remote-changes.service';
import type { iFindingRepository } from '@~/features/findings/finding.repository';
import type { iFindingRecord } from '@~/features/findings/findings.types';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import { mapWithConcurrency } from '@~/lib/concurrency';

import type { iUnitMarkRepository } from '../marks/unit-mark.repository';
import type { iReviewTargetRepository } from '../review-targets/review-target.repository';
import { ReviewsService } from '../reviews.service';
import type { iReviewHistoryEntry } from '../reviews.types';

const HOST_CONCURRENCY = 4;

function latest(dates: readonly (Date | undefined)[]) {
  return new Date(Math.max(...dates.map((date) => date?.getTime() ?? 0)));
}

function findingActivity(finding: iFindingRecord) {
  return latest([finding.createdAt, finding.events.at(-1)?.createdAt]);
}

/** Every started review, including the ones whose branch is gone or whose change was merged or closed. */
@singleton()
export class ReviewHistoryService {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly workspacesService: WorkspacesService,
    private readonly remoteChangesService: RemoteChangesService,
    @inject(REVIEW_TARGET_REPOSITORY_TOKEN) private readonly reviewTargetRepository: iReviewTargetRepository,
    @inject(FINDING_REPOSITORY_TOKEN) private readonly findingRepository: iFindingRepository,
    @inject(UNIT_MARK_REPOSITORY_TOKEN) private readonly unitMarkRepository: iUnitMarkRepository,
  ) {}

  public async list(workspaceId?: string): Promise<iReviewHistoryEntry[]> {
    await this.syncArchive(workspaceId);
    const [targets, workspaces, findings] = await Promise.all([
      this.reviewsService.list(workspaceId),
      this.workspacesService.list(),
      this.findingRepository.list({ workspaceId }),
    ]);
    const names = new Map(workspaces.map((workspace) => [workspace.id, workspace.name]));
    const entries = await Promise.all(
      targets.map(async ({ latestSnapshot, ...target }) => {
        if (!latestSnapshot) return [];
        const own = findings.filter((finding) => finding.targetId === target.id);
        const lastMarkedAt = await this.unitMarkRepository.lastMarkedAt(latestSnapshot.id);
        return [
          {
            ...target,
            latestSnapshot,
            workspaceName: names.get(target.workspaceId) ?? '',
            findingCount: own.length,
            activeFindingCount: own.filter((finding) => IS_ACTIVE_FINDING_STATUS(finding.status)).length,
            lastActivityAt: latest([latestSnapshot.createdAt, lastMarkedAt, ...own.map(findingActivity)]),
          },
        ];
      }),
    );
    return entries.flat().toSorted((first, second) => second.lastActivityAt.getTime() - first.lastActivityAt.getTime());
  }

  /** Brings archive state up to date; a repository or host that cannot be read keeps what it had. */
  private async syncArchive(workspaceId?: string) {
    const workspaceIds = workspaceId
      ? [workspaceId]
      : (await this.workspacesService.list()).map((workspace) => workspace.id);
    await Promise.allSettled(workspaceIds.map(async (id) => this.workspacesService.syncArchive(id)));
    const changes = (await this.reviewTargetRepository.list(workspaceId)).filter(
      (target) => target.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST,
    );
    await mapWithConcurrency(changes, HOST_CONCURRENCY, async (target) =>
      this.remoteChangesService.syncArchive(target).catch(() => undefined),
    );
  }
}

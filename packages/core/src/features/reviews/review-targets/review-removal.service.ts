import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { FIX_STATUSES } from '@chaff/common/enums/fix.enums';

import { FIX_REPOSITORY_TOKEN, REVIEW_TARGET_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iFixRepository } from '@~/features/fixes/fix.repository';
import { FixesService } from '@~/features/fixes/fixes.service';
import { SnapshotStoreService } from '@~/features/reviews/snapshots/snapshot-store.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import { ORPCBadRequestError } from '@~/lib/orpc-error-wrapper';

import type { iReviewTargetRepository } from './review-target.repository';
import type { iReviewTargetRecord } from './review-targets.types';

/** Deletes reviews for good: their snapshots, findings and fixes, and the commits pinned for them in the store. */
@singleton()
export class ReviewRemovalService {
  constructor(
    @inject(REVIEW_TARGET_REPOSITORY_TOKEN) private readonly reviewTargetRepository: iReviewTargetRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    @inject(FIX_REPOSITORY_TOKEN) private readonly fixRepository: iFixRepository,
    private readonly fixesService: FixesService,
    private readonly snapshotStoreService: SnapshotStoreService,
  ) {}

  /** Fails with FIX_STILL_RUNNING, before deleting anything, while an agent is fixing one of the reviews. */
  public async remove(targets: readonly Pick<iReviewTargetRecord, 'id' | 'workspaceId'>[]) {
    const targetIds = targets.map((target) => target.id);
    const fixes = (
      await Promise.all(targetIds.map(async (targetId) => this.fixRepository.listByTarget(targetId)))
    ).flat();
    if (fixes.some((fix) => fix.status === FIX_STATUSES.RUNNING)) {
      throw ORPCBadRequestError(errorCodes.FIX_STILL_RUNNING);
    }
    for (const fix of fixes) await this.fixesService.discard(fix.id);

    const snapshots = await this.snapshotRepository.listByTargets(targetIds);
    await this.reviewTargetRepository.deleteMany(targetIds);
    const workspaceOf = new Map(targets.map((target) => [target.id, target.workspaceId]));
    for (const snapshot of snapshots) {
      const workspaceId = workspaceOf.get(snapshot.targetId);
      if (workspaceId) await this.snapshotStoreService.unpin(workspaceId, snapshot.id, snapshot);
    }
  }
}

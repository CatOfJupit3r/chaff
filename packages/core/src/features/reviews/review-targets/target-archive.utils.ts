import { CHANGE_STATES, changeStatesEnumwaii } from '@chaff/common/enums/code-host.enums';
import type { ChangeState } from '@chaff/common/enums/code-host.enums';
import { ARCHIVE_REASONS, REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';
import type { ArchiveReason } from '@chaff/common/enums/review.enums';

import type { iReviewTargetRecord, iTargetArchive } from './review-targets.types';

export interface iArchiveChange {
  targetId: string;
  archive: iTargetArchive;
}

type iArchivable = Pick<iReviewTargetRecord, 'id' | 'kind' | 'branch' | 'archivedAt' | 'archiveReason'>;

const RESTORED: iTargetArchive = { archivedAt: null, archiveReason: null };

function archiveFor(target: iArchivable, reason: ArchiveReason | null, now: Date): iArchiveChange | undefined {
  if (reason === null) {
    return target.archivedAt ? { targetId: target.id, archive: RESTORED } : undefined;
  }
  if (target.archiveReason === reason) return undefined;
  return { targetId: target.id, archive: { archivedAt: now, archiveReason: reason } };
}

/**
 * The local reviews to move to History because their branch is gone, and the ones to bring back because
 * a branch of that name exists again. Merge and pull requests are left to their host's state.
 */
export function localArchiveChanges(
  targets: readonly iArchivable[],
  branchNames: ReadonlySet<string>,
  now = new Date(),
): iArchiveChange[] {
  return targets.flatMap((target) => {
    if (target.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST) return [];
    const change = archiveFor(target, branchNames.has(target.branch) ? null : ARCHIVE_REASONS.BRANCH_DELETED, now);
    return change ? [change] : [];
  });
}

const STATE_ARCHIVE_REASONS = changeStatesEnumwaii.derive<ArchiveReason | null>()(
  [CHANGE_STATES.OPEN, null],
  [CHANGE_STATES.MERGED, ARCHIVE_REASONS.MERGED],
  [CHANGE_STATES.CLOSED, ARCHIVE_REASONS.CLOSED],
);

/** The archive change a merge or pull request target needs once its host reports the change's state. */
export function changeArchiveChange(target: iArchivable, state: ChangeState, now = new Date()) {
  return archiveFor(target, STATE_ARCHIVE_REASONS.get(state), now);
}

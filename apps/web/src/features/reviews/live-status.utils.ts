import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { pluralize } from '@~/utils/pluralize';

import type { iSnapshot, iSnapshotLiveStatus } from './reviews.types';

/** What changed since the snapshot, in a few words; undefined when nothing did. */
export function describeChange(snapshot: iSnapshot, status: iSnapshotLiveStatus | undefined) {
  if (!status) return undefined;
  if (status.isBranchMissing) return 'branch deleted';
  if (status.isBranchRewritten) return 'branch rewritten';
  if (status.newCommitCount > 0) return pluralize(status.newCommitCount, 'new commit');
  if (status.hasNewWorkingChanges) return 'files changed';
  if (status.isParentChanged) return `parent is now ${snapshot.targetParentBranch}`;
  if (status.isParentMoved && snapshot.kind !== REVIEW_TARGET_KINDS.WORKING_CHANGES) {
    return `${snapshot.parentBranch} moved`;
  }
  if (snapshot.version < snapshot.latestVersion) return 'newer snapshot';
  return undefined;
}

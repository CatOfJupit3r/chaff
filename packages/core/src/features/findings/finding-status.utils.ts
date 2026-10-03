import {
  ANCHOR_MATCHES,
  FINDING_KINDS,
  FINDING_STATUSES,
  IS_ACTIVE_FINDING_STATUS,
} from '@chaff/common/enums/review.enums';
import type { AnchorMatch, FindingKind, FindingStatus } from '@chaff/common/enums/review.enums';

function nextStatus(kind: FindingKind, status: FindingStatus, matches: readonly AnchorMatch[]) {
  if (matches.every((match) => match === ANCHOR_MATCHES.UNMATCHED)) return FINDING_STATUSES.UNMATCHED;
  const isChanged = matches.includes(ANCHOR_MATCHES.CHANGED);
  if (kind === FINDING_KINDS.CONCERN && isChanged && status !== FINDING_STATUSES.FIX_PROPOSED) {
    return FINDING_STATUSES.FIX_PROPOSED;
  }
  return status === FINDING_STATUSES.UNMATCHED ? FINDING_STATUSES.OPEN : status;
}

/**
 * The status a finding moves to once its anchors were looked for in a newer snapshot, or undefined when it
 * stays. Changed code under a concern is a proposed fix, never a verified one; losing every anchor makes
 * any active finding Unmatched; finding the code again puts an Unmatched finding back where it was.
 */
export function statusAfterRelocation(
  kind: FindingKind,
  status: FindingStatus,
  matches: readonly AnchorMatch[],
): FindingStatus | undefined {
  if (!IS_ACTIVE_FINDING_STATUS(status) || matches.length === 0) return undefined;
  const next = nextStatus(kind, status, matches);
  return next === status ? undefined : next;
}

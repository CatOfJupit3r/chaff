import { ANCHOR_MATCHES, FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import type { iAnchorLocationRecord, iFindingRecord } from './findings.types';

/** Statuses at which the reviewer said the code is still to be fixed or explained. */
const RAISED_STATUSES = new Set<FindingStatus>([FINDING_STATUSES.OPEN, FINDING_STATUSES.REOPENED]);

/** The snapshot where the reviewer last opened or reopened the finding. */
export function raisedSnapshotId(finding: Pick<iFindingRecord, 'events'>) {
  return finding.events.findLast((event) => RAISED_STATUSES.has(event.status))?.snapshotId;
}

/**
 * Where an anchor was in the snapshot the finding was last raised on, when that is a later snapshot than
 * the one it was written on. Undefined means the anchor's own quote is the code as raised.
 */
export function raisedLocation(
  history: readonly iAnchorLocationRecord[],
  anchorId: string,
  raisedOn: string | undefined,
) {
  return history.find(
    (location) =>
      location.anchorId === anchorId && location.snapshotId === raisedOn && location.match !== ANCHOR_MATCHES.UNMATCHED,
  );
}

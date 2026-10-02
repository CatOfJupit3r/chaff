import type { ExportScope } from '@chaff/common/enums/export.enums';
import type { AnchorMatch, DiffSide, FindingStatus, UnitKind } from '@chaff/common/enums/review.enums';

import type { iFindingRecord } from '@~/features/findings/findings.types';
import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';
import type { iSnapshotRecord } from '@~/features/reviews/snapshots/snapshots.types';

export interface iPacketOptions {
  snapshotId: string;
  scope: ExportScope;
  /** Findings at these statuses are exported. */
  statuses: FindingStatus[];
  /** Quote each finding's code as it was when the reviewer raised it. */
  shouldQuoteCode: boolean;
  /** List each review's units that have no decision yet, or were put off with Later. */
  shouldListUnreviewed: boolean;
  /** Narrows the export to these findings, e.g. to copy one. */
  findingIds?: string[];
}

/** Lines of one side of a file in one snapshot. */
export interface iPacketLines {
  startLine?: number;
  endLine?: number;
  headSha: string;
}

export interface iPacketAnchor {
  path: string;
  side: DiffSide;
  /** Where the reviewer wrote it, with the code as it was when the finding was last raised. */
  original: iPacketLines & { quote: string; contextBefore: string; contextAfter: string };
  /** Where it is in the review's newest snapshot; absent when it was written on that snapshot. */
  current?: iPacketLines & { match: AnchorMatch };
  unitTitle?: string;
}

export interface iPacketFinding {
  finding: iFindingRecord;
  anchors: iPacketAnchor[];
}

export interface iUnreviewedUnit {
  path: string;
  title: string;
  kind: UnitKind;
}

export interface iPacketReview {
  target: iReviewTargetRecord;
  snapshot: iSnapshotRecord;
  findings: iPacketFinding[];
  unreviewed: iUnreviewedUnit[];
}

/** Everything an export holds, before it is written out as Markdown, JSON or an agent prompt. */
export interface iPacket {
  repository: string;
  exportedAt: Date;
  reviews: iPacketReview[];
  findingCount: number;
}

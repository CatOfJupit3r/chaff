import type { DiffSide, FindingKind, FindingStatus } from '@chaff/common/enums/review.enums';

import type { findingAnchors, findings } from '@~/db/schema/findings.schema';

type FindingRow = typeof findings.$inferSelect;
type FindingAnchorRow = typeof findingAnchors.$inferSelect;

export type iFindingAnchorRecord = Omit<
  FindingAnchorRow,
  'findingId' | 'unitId' | 'fileId' | 'side' | 'startLine' | 'endLine'
> & {
  unitId?: string;
  fileId?: string;
  side: DiffSide;
  startLine?: number;
  endLine?: number;
};

export type iFindingRecord = Omit<FindingRow, 'kind' | 'status'> & {
  kind: FindingKind;
  status: FindingStatus;
  /** Branch of the review the finding was written in. */
  branch: string;
  parentBranch: string;
  anchors: iFindingAnchorRecord[];
};

export type iNewFindingAnchor = Omit<FindingAnchorRow, 'id' | 'findingId'>;

export interface iNewFinding {
  workspaceId: string;
  targetId: string;
  snapshotId: string;
  kind: FindingKind;
  body: string;
  anchors: iNewFindingAnchor[];
}

/** A unit, or a line range on one side of a file, in the snapshot the finding is written on. */
export type iFindingAnchorInput =
  { unitId: string } | { fileId: string; side: DiffSide; startLine: number; endLine: number };

export interface iCreateFindingInput {
  snapshotId: string;
  kind: FindingKind;
  body: string;
  anchors: iFindingAnchorInput[];
}

export interface iListFindingsInput {
  workspaceId?: string;
  targetId?: string;
}

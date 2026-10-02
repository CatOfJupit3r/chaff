import type { CodeHost } from '@chaff/common/enums/code-host.enums';
import type {
  AnchorMatch,
  DiffSide,
  FindingEventSource,
  FindingKind,
  FindingStatus,
} from '@chaff/common/enums/review.enums';

import type {
  findingAnchorLocations,
  findingAnchors,
  findingEvents,
  findingPosts,
  findings,
} from '@~/db/schema/findings.schema';

type FindingRow = typeof findings.$inferSelect;
type FindingAnchorRow = typeof findingAnchors.$inferSelect;
type AnchorLocationRow = typeof findingAnchorLocations.$inferSelect;
type FindingEventRow = typeof findingEvents.$inferSelect;
type FindingPostRow = typeof findingPosts.$inferSelect;

/** Where an anchor was found in a later snapshot, with that snapshot's version and head. */
export type iAnchorLocationRecord = Omit<AnchorLocationRow, 'match' | 'fileId' | 'unitId' | 'startLine' | 'endLine'> & {
  match: AnchorMatch;
  fileId?: string;
  unitId?: string;
  startLine?: number;
  endLine?: number;
  version: number;
  headSha: string;
};

export type iAnchorLocationSummary = Omit<
  iAnchorLocationRecord,
  'anchorId' | 'text' | 'contextBefore' | 'contextAfter'
>;

export type iNewAnchorLocation = Omit<AnchorLocationRow, 'id'>;

export type iFindingEventRecord = Omit<
  FindingEventRow,
  'id' | 'findingId' | 'status' | 'source' | 'note' | 'commits'
> & {
  status: FindingStatus;
  source: FindingEventSource;
  note?: string;
  commits?: string[];
};

/** Where a finding was posted on its merge or pull request. */
export type iFindingPostRecord = Omit<FindingPostRow, 'id' | 'findingId' | 'host' | 'url'> & {
  host: CodeHost;
  url?: string;
};

export type iNewFindingPost = Omit<FindingPostRow, 'id' | 'createdAt'>;

/** Who moved a finding, and what they said about it. */
export interface iStatusChange {
  answer?: string;
  source?: FindingEventSource;
  note?: string;
  commits?: string[];
}

export type iFindingAnchorRecord = Omit<
  FindingAnchorRow,
  'findingId' | 'unitId' | 'fileId' | 'side' | 'startLine' | 'endLine'
> & {
  unitId?: string;
  fileId?: string;
  side: DiffSide;
  startLine?: number;
  endLine?: number;
  /** Where the anchor was found in each later snapshot, oldest first. */
  locations: iAnchorLocationSummary[];
};

export type iFindingRecord = Omit<FindingRow, 'kind' | 'status' | 'answer'> & {
  kind: FindingKind;
  status: FindingStatus;
  answer?: string;
  /** Every status the finding went through, oldest first. */
  events: iFindingEventRecord[];
  /** Set once the finding was posted to its merge or pull request. */
  post?: iFindingPostRecord;
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

/** An anchor's code in one snapshot, for showing it before and after a fix. */
export type iAnchorText = Pick<
  iAnchorLocationRecord,
  'snapshotId' | 'version' | 'headSha' | 'match' | 'fileId' | 'unitId' | 'startLine' | 'endLine' | 'text'
>;

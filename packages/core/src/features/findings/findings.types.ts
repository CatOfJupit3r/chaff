import type { CodeHost } from '@chaff/common/enums/code-host.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import type {
  AnchorMatch,
  DiffSide,
  FindingEventSource,
  FindingKind,
  FindingScope,
  FindingSeverity,
  FindingStatus,
  FindingTaskState,
} from '@chaff/common/enums/review.enums';

import type {
  findingAnchorLocations,
  findingAnchors,
  findingEvents,
  findingPosts,
  findingReplies,
  findings,
  findingTasks,
} from '@~/db/schema/findings.schema';

type FindingRow = typeof findings.$inferSelect;
type FindingAnchorRow = typeof findingAnchors.$inferSelect;
type AnchorLocationRow = typeof findingAnchorLocations.$inferSelect;
type FindingEventRow = typeof findingEvents.$inferSelect;
type FindingPostRow = typeof findingPosts.$inferSelect;
type FindingTaskRow = typeof findingTasks.$inferSelect;
type FindingReplyRow = typeof findingReplies.$inferSelect;

/** The finding restated as a task for a coding agent, apart from the comment. */
export type iFindingTaskRecord = Omit<
  FindingTaskRow,
  'findingId' | 'state' | 'runner' | 'task' | 'verify' | 'error'
> & {
  state: FindingTaskState;
  runner: DigestRunner;
  task?: string;
  verify?: string;
  error?: string;
};

export type iFindingTaskChange = Pick<iFindingTaskRecord, 'state' | 'runner' | 'task' | 'verify' | 'error'>;

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
export type iFindingPostRecord = Omit<FindingPostRow, 'id' | 'findingId' | 'host' | 'url' | 'discussionId'> & {
  host: CodeHost;
  url?: string;
  discussionId?: string;
};

export type iNewFindingPost = Omit<FindingPostRow, 'id' | 'createdAt' | 'discussionId'>;

/** An answer on the host to a posted finding. */
export type iFindingReplyRecord = Omit<FindingReplyRow, 'id' | 'findingId'>;

export type iNewFindingReply = Omit<FindingReplyRow, 'id'>;

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

export type iFindingRecord = Omit<FindingRow, 'kind' | 'status' | 'answer' | 'severity' | 'scope'> & {
  kind: FindingKind;
  status: FindingStatus;
  severity?: FindingSeverity;
  scope: FindingScope;
  answer?: string;
  /** Every status the finding went through, oldest first. */
  events: iFindingEventRecord[];
  /** Set once the finding was posted to its merge or pull request. */
  post?: iFindingPostRecord;
  /** Set once a task was suggested or written for it. */
  task?: iFindingTaskRecord;
  /** Answers on the host since it was posted, oldest first. */
  replies: iFindingReplyRecord[];
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
  severity?: FindingSeverity;
  scope: FindingScope;
  body: string;
  anchors: iNewFindingAnchor[];
}

/** A unit, or a line range on one side of a file, in the snapshot the finding is written on. */
export type iFindingAnchorInput =
  { unitId: string } | { fileId: string; side: DiffSide; startLine: number; endLine: number };

export interface iCreateFindingInput {
  snapshotId: string;
  kind: FindingKind;
  severity?: FindingSeverity;
  /** Code when there are anchors, else the whole branch unless the whole stack is asked for. */
  scope?: FindingScope;
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

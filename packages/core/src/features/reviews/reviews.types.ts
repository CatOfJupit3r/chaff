import type { CodeHost } from '@chaff/common/enums/code-host.enums';
import type { ArchiveReason, ReviewTargetKind, UnitMark } from '@chaff/common/enums/review.enums';

import type { iNewReviewTarget } from './review-targets/review-targets.types';
import type { iSnapshotFileSummary, iSnapshotRecord } from './snapshots/snapshots.types';

export type iStartReviewInput = Omit<iNewReviewTarget, 'kind'> & { kind: ReviewTargetKind };

export type iSnapshotSummary = Pick<
  iSnapshotRecord,
  'id' | 'version' | 'headSha' | 'fileCount' | 'additions' | 'deletions' | 'regionCount' | 'unitCount' | 'createdAt'
> & {
  /** Units marked Looks good, Concern or Question. */
  inspectedUnitCount: number;
  accountedRegionCount: number;
  laterUnitCount: number;
  /** Units per decision, for progress bars split by decision. */
  markCounts: { mark: UnitMark; count: number }[];
};

/** The merge or pull request a target reviews. */
export interface iChangeRequestInfo {
  host: CodeHost;
  project: string;
  number: number;
  title: string;
  webUrl: string;
}

export interface iReviewTargetResponse {
  id: string;
  workspaceId: string;
  branch: string;
  kind: ReviewTargetKind;
  parentBranch: string;
  change?: iChangeRequestInfo;
  latestSnapshot?: iSnapshotSummary;
  findingCount: number;
  /** Findings still open or waiting on a fix or a check. */
  activeFindingCount: number;
  archived?: { at: Date; reason: ArchiveReason };
}

export type iReviewHistoryEntry = Omit<iReviewTargetResponse, 'latestSnapshot'> & {
  latestSnapshot: iSnapshotSummary;
  workspaceName: string;
  lastActivityAt: Date;
};

export type iSnapshotResponse = iSnapshotSummary &
  Pick<iSnapshotRecord, 'targetId' | 'parentBranch' | 'parentHeadSha' | 'baseSha'> & {
    workspaceId: string;
    branch: string;
    kind: ReviewTargetKind;
    /** The branch's current parent, which differs from `parentBranch` after the reviewer changed it. */
    targetParentBranch: string;
    /** The merge request's diff version on the host, when the host numbers them. */
    remoteVersion?: number;
    latestVersion: number;
    change?: iChangeRequestInfo;
    files: iSnapshotFileSummary[];
  };

export interface iSnapshotLiveStatus {
  /** Branch moves are pushed by watching the repository's refs; otherwise the status is re-read on a timer. */
  isWatched: boolean;
  isBranchMissing: boolean;
  newCommitCount: number;
  isBranchRewritten: boolean;
  isParentMoved: boolean;
  /** The reviewer picked another parent since the snapshot was taken. */
  isParentChanged: boolean;
  /** Working changes only: the uncommitted work changed since the snapshot. */
  hasNewWorkingChanges: boolean;
}

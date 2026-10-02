import type { CodeHost } from '@chaff/common/enums/code-host.enums';
import type { ReviewTargetKind, UnitMark } from '@chaff/common/enums/review.enums';

import type { iNewReviewTarget } from './review-targets/review-targets.types';
import type { iSnapshotFileSummary, iSnapshotRecord } from './snapshots/snapshots.types';

export type iStartReviewInput = Omit<iNewReviewTarget, 'kind'> & { kind: ReviewTargetKind };

export type iSetParentInput = Pick<iNewReviewTarget, 'workspaceId' | 'branch' | 'parentBranch'>;

export type iSnapshotSummary = Pick<
  iSnapshotRecord,
  'id' | 'version' | 'headSha' | 'fileCount' | 'additions' | 'deletions' | 'regionCount' | 'unitCount' | 'createdAt'
> & {
  /** Units marked Looks good, Concern or Question. */
  inspectedUnitCount: number;
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
}

export type iSnapshotResponse = iSnapshotSummary &
  Pick<iSnapshotRecord, 'targetId' | 'parentBranch' | 'parentHeadSha' | 'baseSha'> & {
    workspaceId: string;
    branch: string;
    kind: ReviewTargetKind;
    /** The branch's current parent, which differs from `parentBranch` after the reviewer changed it. */
    targetParentBranch: string;
    latestVersion: number;
    change?: iChangeRequestInfo;
    files: iSnapshotFileSummary[];
  };

export interface iSnapshotLiveStatus {
  isBranchMissing: boolean;
  newCommitCount: number;
  isBranchRewritten: boolean;
  isParentMoved: boolean;
  /** The reviewer picked another parent since the snapshot was taken. */
  isParentChanged: boolean;
  /** Working changes only: the uncommitted work changed since the snapshot. */
  hasNewWorkingChanges: boolean;
}

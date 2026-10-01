import type { iNewReviewTarget } from './review-targets/review-targets.types';
import type { iSnapshotFileSummary, iSnapshotRecord } from './snapshots/snapshots.types';

export type iStartReviewInput = iNewReviewTarget;

export type iSnapshotSummary = Pick<
  iSnapshotRecord,
  'id' | 'version' | 'headSha' | 'fileCount' | 'additions' | 'deletions' | 'regionCount' | 'unitCount' | 'createdAt'
>;

export interface iReviewTargetResponse {
  id: string;
  workspaceId: string;
  branch: string;
  parentBranch: string;
  latestSnapshot?: iSnapshotSummary;
}

export type iSnapshotResponse = iSnapshotSummary &
  Pick<iSnapshotRecord, 'targetId' | 'parentBranch' | 'parentHeadSha' | 'baseSha'> & {
    workspaceId: string;
    branch: string;
    latestVersion: number;
    files: iSnapshotFileSummary[];
  };

export interface iSnapshotLiveStatus {
  isBranchMissing: boolean;
  newCommitCount: number;
  isBranchRewritten: boolean;
  isParentMoved: boolean;
}

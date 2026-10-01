import { FILE_KINDS, FILE_STATUSES } from '@chaff/common/enums/review.enums';

import type { iReviewTarget, iSnapshotFile } from '@~/features/reviews/reviews.types';

export function snapshotFile(path: string, overrides: Partial<iSnapshotFile> = {}): iSnapshotFile {
  return {
    id: `file:${path}`,
    ordinal: 0,
    path,
    status: FILE_STATUSES.MODIFIED,
    kind: FILE_KINDS.SOURCE,
    oldMode: '100644',
    newMode: '100644',
    isBinary: false,
    isTooLarge: false,
    additions: 3,
    deletions: 1,
    unitCount: 1,
    regionCount: 1,
    ...overrides,
  };
}

export function reviewTarget(branch: string, overrides: Partial<iReviewTarget> = {}): iReviewTarget {
  return {
    id: `target:${branch}`,
    workspaceId: 'workspace-1',
    branch,
    parentBranch: 'main',
    ...overrides,
  };
}

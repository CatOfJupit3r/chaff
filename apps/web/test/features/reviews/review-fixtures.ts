import {
  FILE_KINDS,
  FILE_STATUSES,
  REVIEW_TARGET_KINDS,
  UNIT_CHANGES,
  UNIT_KINDS,
} from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import type { iReviewTarget, iSnapshotFile, iSnapshotSummary, iUnit } from '@~/features/reviews/reviews.types';

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
    kind: REVIEW_TARGET_KINDS.BRANCH,
    parentBranch: 'main',
    ...overrides,
  };
}

export function snapshotSummary(createdAt: string, overrides: Partial<iSnapshotSummary> = {}): iSnapshotSummary {
  return {
    id: `snapshot:${createdAt}`,
    version: 1,
    headSha: 'sha',
    fileCount: 1,
    additions: 1,
    deletions: 0,
    regionCount: 0,
    unitCount: 0,
    inspectedUnitCount: 0,
    laterUnitCount: 0,
    markCounts: [],
    createdAt: new Date(createdAt),
    ...overrides,
  };
}

export function unitFixture(id: string, mark?: UnitMark, overrides: Partial<iUnit> = {}): iUnit {
  return {
    id,
    fileId: 'file',
    ordinal: 0,
    kind: UNIT_KINDS.FUNCTION,
    title: id,
    isExported: false,
    change: UNIT_CHANGES.MODIFIED,
    additions: 3,
    deletions: 1,
    mark,
    isMarkCarried: false,
    ...overrides,
  };
}

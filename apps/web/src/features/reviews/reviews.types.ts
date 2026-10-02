import type { ORPCOutputs } from '@~/utils/orpc';

export type iReviewTarget = ORPCOutputs['reviews']['list'][number];

export type iSnapshotSummary = NonNullable<iReviewTarget['latestSnapshot']>;

export type iSnapshot = ORPCOutputs['reviews']['snapshot'];

export type iSnapshotFile = iSnapshot['files'][number];

export type iSnapshotLiveStatus = ORPCOutputs['reviews']['liveStatus'];

/** A folder in the changed-file tree; chains of folders with a single child folder are merged into one. */
export interface iFileTreeFolder {
  name: string;
  path: string;
  folders: iFileTreeFolder[];
  files: iSnapshotFile[];
  fileCount: number;
}

export type iUnit = ORPCOutputs['reviews']['units'][number];

export type iUnitDetail = ORPCOutputs['reviews']['unitDetail'];

export type iUnitUsages = ORPCOutputs['reviews']['unitUsages'];

export type iUnitUsage = iUnitUsages['usages'][number];

export type iDiffSearch = ORPCOutputs['reviews']['searchDiff'];

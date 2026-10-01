import type { FileStatus } from '@chaff/common/enums/review.enums';

import type { DiffLineType } from './diff.enums';

/** One entry of `git diff --raw`: what happened to a path between the base and the head. */
export interface iRawDiffEntry {
  status: FileStatus;
  path: string;
  /** Same as `path` unless the file was renamed. */
  oldPath: string;
  oldMode?: string;
  newMode?: string;
  oldBlobSha?: string;
  newBlobSha?: string;
}

export interface iDiffLine {
  type: DiffLineType;
  /** Line number on the old side; absent for added lines. */
  oldLine?: number;
  /** Line number on the new side; absent for deleted lines. */
  newLine?: number;
  text: string;
  hunkIndex: number;
}

export interface iParsedPatch {
  isBinary: boolean;
  lines: iDiffLine[];
}

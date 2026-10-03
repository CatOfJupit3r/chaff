import { FILE_KINDS, FILE_STATUS_LABELS, FILE_STATUSES } from '@chaff/common/enums/review.enums';

import { FILE_DISPLAYS } from './reviews.enums';
import type { FileDisplay } from './reviews.enums';
import type { iSnapshotFile } from './reviews.types';

export type iFileStatusFile = Pick<iSnapshotFile, 'status' | 'oldPath'>;

/** Hover text for a file's status, with the previous path of a renamed file. */
export function fileStatusTitle({ status, oldPath }: iFileStatusFile) {
  return oldPath ? `${FILE_STATUS_LABELS.get(status)} from ${oldPath}` : FILE_STATUS_LABELS.get(status);
}

/** Diffs with more changed lines than this stay collapsed until asked for. */
export const LARGE_DIFF_LINES = 1500;

/** Picks how a changed file is shown: its diff, a collapsed diff, or a note for changes without lines. */
export function getFileDisplay(file: iSnapshotFile): FileDisplay {
  if (file.isTooLarge) return FILE_DISPLAYS.TOO_LARGE;
  if (file.isBinary) return FILE_DISPLAYS.BINARY;
  if (file.kind === FILE_KINDS.GENERATED) return FILE_DISPLAYS.GENERATED;

  const changedLines = file.additions + file.deletions;
  if (changedLines > LARGE_DIFF_LINES) return FILE_DISPLAYS.LARGE;
  if (changedLines > 0) return FILE_DISPLAYS.DIFF;

  if (file.status === FILE_STATUSES.RENAMED) return FILE_DISPLAYS.RENAME_ONLY;
  if (file.oldMode && file.newMode && file.oldMode !== file.newMode) return FILE_DISPLAYS.MODE_ONLY;
  return FILE_DISPLAYS.EMPTY;
}

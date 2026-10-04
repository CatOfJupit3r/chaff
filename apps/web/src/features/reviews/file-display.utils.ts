import { FILE_PREVIEWS } from '@chaff/common/enums/file-preview.enums';
import type { FilePreview } from '@chaff/common/enums/file-preview.enums';
import { FILE_KINDS, FILE_STATUS_LABELS, FILE_STATUSES } from '@chaff/common/enums/review.enums';
import { filePreviewOf } from '@chaff/common/helpers/file-preview.helper';

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

/** Picks how a changed file is shown: its diff, a collapsed diff, an image, or a note for changes without lines. */
export function getFileDisplay(file: iSnapshotFile): FileDisplay {
  if (file.isTooLarge) return FILE_DISPLAYS.TOO_LARGE;
  if (file.isBinary) {
    return filePreviewOf(file.path) === FILE_PREVIEWS.IMAGE ? FILE_DISPLAYS.IMAGE : FILE_DISPLAYS.BINARY;
  }
  if (file.kind === FILE_KINDS.GENERATED) return FILE_DISPLAYS.GENERATED;

  const changedLines = file.additions + file.deletions;
  if (changedLines > LARGE_DIFF_LINES) return FILE_DISPLAYS.LARGE;
  if (changedLines > 0) return FILE_DISPLAYS.DIFF;

  if (file.status === FILE_STATUSES.RENAMED) return FILE_DISPLAYS.RENAME_ONLY;
  if (file.oldMode && file.newMode && file.oldMode !== file.newMode) return FILE_DISPLAYS.MODE_ONLY;
  return FILE_DISPLAYS.EMPTY;
}

/** How a text file can also be shown drawn (SVG, Markdown, Mermaid); binary images are always drawn. */
export function getTextPreview(file: iSnapshotFile): FilePreview | undefined {
  return file.isBinary ? undefined : filePreviewOf(file.path);
}

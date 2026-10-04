import type { iSnapshotFile } from '@~/features/reviews/reviews.types';

/** Why a file's code view has no lines to show. */
export function codeNoteFor(file: iSnapshotFile) {
  if (file.isBinary) return 'Binary file; there are no lines to show.';
  if (file.isTooLarge) return 'This diff is too large to keep; open the file in your editor.';
  return 'No lines changed in this file; the change is to its name or mode.';
}

import { DIFF_LAYOUTS } from '@chaff/common/enums/diff.enums';

import { FileNote } from '@~/features/reviews/components/file-notes';
import { ImagePreview } from '@~/features/reviews/components/image-preview';
import { PreviewBoundary } from '@~/features/reviews/components/preview-boundary';
import { getFileDisplay } from '@~/features/reviews/file-display.utils';
import { FILE_DISPLAYS } from '@~/features/reviews/reviews.enums';
import type { iSnapshotFile } from '@~/features/reviews/reviews.types';

import { codeNoteFor } from '../code-view.utils';

interface iFileWithoutLinesProps {
  snapshotId: string;
  file: iSnapshotFile;
}

/** In place of a code view for a file without lines: the image drawn, or why there is nothing to show. */
export function FileWithoutLines({ snapshotId, file }: iFileWithoutLinesProps) {
  if (getFileDisplay(file) === FILE_DISPLAYS.IMAGE) {
    return (
      <PreviewBoundary>
        <ImagePreview snapshotId={snapshotId} file={file} layout={DIFF_LAYOUTS.split} />
      </PreviewBoundary>
    );
  }
  return <FileNote>{codeNoteFor(file)}</FileNote>;
}

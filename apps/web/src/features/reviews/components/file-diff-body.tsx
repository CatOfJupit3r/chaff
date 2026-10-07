import { useState } from 'react';

import type { DiffLayout } from '@chaff/common/enums/diff.enums';
import { FILE_PREVIEWS } from '@chaff/common/enums/file-preview.enums';

import { SegmentedControl } from '@~/components/ui/segmented-control';

import { getFileDisplay, getTextPreview } from '../file-display.utils';
import { FILE_BODY_VIEW_LABELS, FILE_BODY_VIEWS, FILE_DISPLAYS, fileBodyViewValues } from '../reviews.enums';
import type { FileBodyView } from '../reviews.enums';
import type { iSnapshotFile } from '../reviews.types';
import { FileDiffLines } from './file-diff-lines';
import { ImagePreview } from './image-preview';
import { PreviewBoundary } from './preview-boundary';
import { TextPreview } from './text-preview';

const VIEW_OPTIONS = fileBodyViewValues.map((value) => ({ value, label: FILE_BODY_VIEW_LABELS.get(value) }));

interface iFileDiffBodyProps {
  snapshotId: string;
  file: iSnapshotFile;
  layout: DiffLayout;
  isWrapped: boolean;
}

/** A file's diff; images are drawn, and SVG, Markdown, Mermaid, CSV and TSV files can switch to a drawn preview. */
export function FileDiffBody({ snapshotId, file, layout, isWrapped }: iFileDiffBodyProps) {
  const display = getFileDisplay(file);
  const preview = getTextPreview(file);
  const [view, setView] = useState<FileBodyView>(FILE_BODY_VIEWS.DIFF);

  if (display === FILE_DISPLAYS.IMAGE) {
    return (
      <PreviewBoundary>
        <ImagePreview snapshotId={snapshotId} file={file} layout={layout} />
      </PreviewBoundary>
    );
  }
  const lines = (
    <FileDiffLines snapshotId={snapshotId} file={file} display={display} layout={layout} isWrapped={isWrapped} />
  );
  if (!preview) return lines;
  const drawn = (
    <PreviewBoundary>
      {preview === FILE_PREVIEWS.IMAGE ? (
        <ImagePreview snapshotId={snapshotId} file={file} layout={layout} />
      ) : (
        <TextPreview snapshotId={snapshotId} file={file} preview={preview} layout={layout} />
      )}
    </PreviewBoundary>
  );

  return (
    <>
      <div className="flex items-center border-b border-line px-4 py-1.5">
        <SegmentedControl label={`Show ${file.path} as`} options={VIEW_OPTIONS} value={view} onChange={setView} />
      </div>
      {view === FILE_BODY_VIEWS.PREVIEW ? drawn : lines}
    </>
  );
}

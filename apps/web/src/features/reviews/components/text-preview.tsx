import type { DiffLayout } from '@chaff/common/enums/diff.enums';
import { FILE_PREVIEWS } from '@chaff/common/enums/file-preview.enums';
import type { FilePreview } from '@chaff/common/enums/file-preview.enums';
import { DIFF_SIDES } from '@chaff/common/enums/review.enums';
import type { DiffSide } from '@chaff/common/enums/review.enums';

import { MermaidDiagram } from '@~/features/digests/components/mermaid-diagram';
import { getErrorMessage } from '@~/utils/rpc-errors';

import { useFileContents } from '../hooks/use-file-contents';
import type { iSnapshotFile } from '../reviews.types';
import { FileNote } from './file-notes';
import { MarkdownPreview } from './markdown-preview';
import { PreviewSides } from './preview-sides';
import { PreviewSkeleton } from './skeleton-components';
import { TablePreview } from './table-preview';

/** Longer texts are not drawn, so a huge document cannot freeze the window. */
const MAX_PREVIEW_CHARACTERS = 1_000_000;

interface iTextPreviewProps {
  snapshotId: string;
  file: iSnapshotFile;
  /** Markdown, Mermaid, CSV or TSV; images are drawn by `ImagePreview`. */
  preview: FilePreview;
  layout: DiffLayout;
}

/** A Markdown document, Mermaid diagram or CSV/TSV table drawn as it was before and after the change. */
export function TextPreview({ snapshotId, file, preview, layout }: iTextPreviewProps) {
  const contents = useFileContents(snapshotId, file.id);

  if (contents.error) return <FileNote>Could not load this file: {getErrorMessage(contents.error)}</FileNote>;
  if (!contents.data) return <PreviewSkeleton />;
  const { oldContents, newContents } = contents.data;
  if (oldContents === null && newContents === null) {
    return <FileNote>This file is too large to preview. Open it in your editor instead.</FileNote>;
  }
  if ((oldContents?.length ?? 0) > MAX_PREVIEW_CHARACTERS || (newContents?.length ?? 0) > MAX_PREVIEW_CHARACTERS) {
    return <FileNote>This file is too large to draw here. Use the diff, or open it in your editor.</FileNote>;
  }
  if (preview === FILE_PREVIEWS.CSV || preview === FILE_PREVIEWS.TSV) {
    const delimiter = preview === FILE_PREVIEWS.TSV ? '\t' : ',';
    return <TablePreview oldText={oldContents} newText={newContents} delimiter={delimiter} layout={layout} />;
  }

  const draw = (text: string, side: DiffSide) => {
    const path = side === DIFF_SIDES.OLD ? (file.oldPath ?? file.path) : file.path;
    if (preview === FILE_PREVIEWS.MERMAID) return <MermaidDiagram source={text} title={path} />;
    return <MarkdownPreview snapshotId={snapshotId} side={side} path={path} text={text} />;
  };

  return (
    <PreviewSides
      layout={layout}
      before={oldContents === null ? undefined : draw(oldContents, DIFF_SIDES.OLD)}
      after={newContents === null ? undefined : draw(newContents, DIFF_SIDES.NEW)}
    />
  );
}

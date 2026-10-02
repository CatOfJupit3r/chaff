import { useState } from 'react';

import type { DiffLayout } from '@chaff/common/enums/diff.enums';
import { FILE_STATUS_LABELS } from '@chaff/common/enums/review.enums';

import { pluralize } from '@~/utils/pluralize';
import { getErrorMessage } from '@~/utils/rpc-errors';

import { getFileDisplay } from '../file-display.utils';
import { useFileDiff } from '../hooks/use-file-diff';
import { FILE_DISPLAYS } from '../reviews.enums';
import type { iSnapshotFile } from '../reviews.types';
import { CollapsedFileNote, FileNote } from './file-notes';
import { PatchView } from './patch-view';
import { DiffSkeleton } from './skeleton-components';

interface iFileDiffBodyProps {
  snapshotId: string;
  file: iSnapshotFile;
  layout: DiffLayout;
  isWrapped: boolean;
}

/** A file's diff, or a note when there are no lines to show or the diff stays collapsed until asked for. */
export function FileDiffBody({ snapshotId, file, layout, isWrapped }: iFileDiffBodyProps) {
  const display = getFileDisplay(file);
  const [isLoadRequested, setIsLoadRequested] = useState(false);
  const isCollapsed = (display === FILE_DISPLAYS.GENERATED || display === FILE_DISPLAYS.LARGE) && !isLoadRequested;
  const hasPatch =
    display === FILE_DISPLAYS.DIFF || display === FILE_DISPLAYS.GENERATED || display === FILE_DISPLAYS.LARGE;
  const diff = useFileDiff(snapshotId, file.id, hasPatch && !isCollapsed);
  const changedLines = pluralize(file.additions + file.deletions, 'changed line');

  if (display === FILE_DISPLAYS.TOO_LARGE) {
    return <FileNote>Too large to show here ({changedLines}). Open it in your editor instead.</FileNote>;
  }
  if (display === FILE_DISPLAYS.BINARY) {
    return <FileNote>Binary file {FILE_STATUS_LABELS(file.status).toLowerCase()}.</FileNote>;
  }
  if (display === FILE_DISPLAYS.RENAME_ONLY) {
    return <FileNote>Renamed from {file.oldPath}, contents unchanged.</FileNote>;
  }
  if (display === FILE_DISPLAYS.MODE_ONLY) {
    return (
      <FileNote>
        File mode changed from {file.oldMode} to {file.newMode}.
      </FileNote>
    );
  }
  if (display === FILE_DISPLAYS.EMPTY) {
    return <FileNote>{FILE_STATUS_LABELS(file.status)} with no lines.</FileNote>;
  }
  if (isCollapsed) {
    return (
      <CollapsedFileNote onLoad={() => setIsLoadRequested(true)}>
        {display === FILE_DISPLAYS.GENERATED
          ? 'Generated file, collapsed.'
          : `Large diff (${changedLines}), collapsed.`}
      </CollapsedFileNote>
    );
  }
  if (diff.error) return <FileNote>Could not load this diff: {getErrorMessage(diff.error)}</FileNote>;
  if (!diff.data) return <DiffSkeleton lineCount={file.additions + file.deletions} />;
  if (diff.data.patch === null) return <FileNote>Too large to show here ({changedLines}).</FileNote>;

  return (
    <PatchView snapshotId={snapshotId} file={file} patch={diff.data.patch} layout={layout} isWrapped={isWrapped} />
  );
}

import { Link } from '@tanstack/react-router';

import { ExternalIcon, FileIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { DiffStat } from '@~/features/reviews/components/diff-stat';
import { FileNote } from '@~/features/reviews/components/file-notes';
import { PatchView } from '@~/features/reviews/components/patch-view';
import { DiffSkeleton } from '@~/features/reviews/components/skeleton-components';
import { DIFF_LAYOUTS, DIFF_MODES } from '@~/features/reviews/reviews.enums';
import type { iSnapshotFile, iUnit, iUnitDetail } from '@~/features/reviews/reviews.types';

interface iUnitCodeViewProps {
  snapshotId: string;
  unit: iUnit;
  file: iSnapshotFile;
  detail: iUnitDetail | undefined;
  onOpenInEditor: (path: string, line?: number) => void;
}

function noteFor(file: iSnapshotFile) {
  if (file.isBinary) return 'Binary file; there are no lines to show.';
  if (file.isTooLarge) return 'This diff is too large to keep; open the file in your editor.';
  return 'No lines changed in this file; the change is to its name or mode.';
}

/** The unit's file bar and its code, whole, with the changes marked. */
export function UnitCodeView({ snapshotId, unit, file, detail, onOpenInEditor }: iUnitCodeViewProps) {
  const line = unit.newStartLine ?? unit.oldStartLine ?? 1;

  return (
    <>
      <div className="flex items-center gap-2.5 border-y border-line bg-canvas py-2 pr-3.5 pl-[22px] text-[12.5px] text-muted">
        <FileIcon className="size-3.5" />
        <span className="truncate font-mono text-fg">{file.path}</span>
        <DiffStat additions={file.additions} deletions={file.deletions} />
        <span className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => onOpenInEditor(file.path, line)}>
          <ExternalIcon />
          Open in editor
        </Button>
        <Link
          to="/reviews/$snapshotId/diff"
          params={{ snapshotId }}
          search={{ file: file.path, mode: DIFF_MODES.file, layout: DIFF_LAYOUTS.unified }}
          className="inline-flex h-[26px] items-center rounded-sm px-[9px] text-[12px] text-muted hover:bg-hover hover:text-fg"
        >
          Open in diff
        </Link>
      </div>
      <div className="max-h-[46vh] scrollbar-gutter-stable overflow-auto bg-canvas">
        {detail === undefined ? <DiffSkeleton /> : null}
        {detail?.patch ? (
          <PatchView
            snapshotId={snapshotId}
            file={file}
            patch={detail.patch}
            layout={DIFF_LAYOUTS.unified}
            isWrapped={false}
          />
        ) : null}
        {detail && !detail.patch ? <FileNote>{noteFor(file)}</FileNote> : null}
      </div>
    </>
  );
}

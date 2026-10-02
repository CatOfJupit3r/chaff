import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { DIFF_LAYOUTS } from '@chaff/common/enums/diff.enums';
import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';

import { ExternalIcon, FileIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { DiffStat } from '@~/features/reviews/components/diff-stat';
import { FileNote } from '@~/features/reviews/components/file-notes';
import { PatchView } from '@~/features/reviews/components/patch-view';
import { DiffSkeleton } from '@~/features/reviews/components/skeleton-components';
import { DIFF_MODES } from '@~/features/reviews/reviews.enums';
import type { iSnapshotFile, iUnit, iUnitDetail } from '@~/features/reviews/reviews.types';

import { CODE_SCOPE_LABELS, CODE_SCOPES, codeScopeValues } from '../focus.enums';
import type { CodeScope } from '../focus.enums';
import { useCodeExpansion } from '../hooks/use-code-expansion';
import { useUnitInterdiff } from '../hooks/use-unit-interdiff';
import { UnitInterdiffView } from './unit-interdiff-view';

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

/**
 * The unit's file bar and its code, whole, with the changes marked. A unit edited since the reviewer
 * decided on it shows only what changed since then, with the whole change a click away.
 */
export function UnitCodeView({ snapshotId, unit, file, detail, onOpenInEditor }: iUnitCodeViewProps) {
  const line = unit.newStartLine ?? unit.oldStartLine ?? 1;
  const interdiff = useUnitInterdiff(snapshotId, unit);
  const [scope, setScope] = useState<CodeScope>(CODE_SCOPES['since-review']);
  const isSinceReview = interdiff.reviewed !== undefined && scope === CODE_SCOPES['since-review'];
  const expansion = useCodeExpansion([unit.id]);

  return (
    <>
      <div className="flex items-center gap-2.5 border-y border-line bg-canvas py-2 pr-3.5 pl-[22px] text-[12.5px] text-muted">
        <FileIcon className="size-3.5" />
        <span className="truncate font-mono text-fg">{file.path}</span>
        <DiffStat additions={file.additions} deletions={file.deletions} />
        <span className="flex-1" />
        {interdiff.reviewed ? (
          <SegmentedControl
            label="Compare"
            options={codeScopeValues.map((value) => ({ value, label: CODE_SCOPE_LABELS(value) }))}
            value={scope}
            onChange={setScope}
          />
        ) : null}
        {detail?.patch && !isSinceReview ? (
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={expansion.isExpanded}
            data-onboarding={ONBOARDING_ITEMS.WHOLE_FILE}
            title="Show every line of the file around the change"
            onClick={expansion.toggle}
          >
            Whole file
          </Button>
        ) : null}
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
        {isSinceReview ? <UnitInterdiffView unit={unit} file={file} interdiff={interdiff} /> : null}
        {!isSinceReview && detail === undefined ? <DiffSkeleton /> : null}
        {!isSinceReview && detail?.patch ? (
          <PatchView
            snapshotId={snapshotId}
            file={file}
            patch={detail.patch}
            layout={DIFF_LAYOUTS.unified}
            isWrapped={false}
            isExpanded={expansion.isExpanded}
          />
        ) : null}
        {!isSinceReview && detail && !detail.patch ? <FileNote>{noteFor(file)}</FileNote> : null}
      </div>
    </>
  );
}

import { useState } from 'react';

import { DIFF_LAYOUTS } from '@chaff/common/enums/diff.enums';

import { SegmentedControl } from '@~/components/ui/segmented-control';
import { PatchView } from '@~/features/reviews/components/patch-view';
import { DiffSkeleton } from '@~/features/reviews/components/skeleton-components';
import type { iSnapshotFile, iUnit } from '@~/features/reviews/reviews.types';

import { CODE_SCOPE_LABELS, CODE_SCOPES, codeScopeValues } from '../focus.enums';
import type { CodeScope } from '../focus.enums';
import { useCodeExpansion } from '../hooks/use-code-expansion';
import { useScrollToCodeRow } from '../hooks/use-scroll-to-code-row';
import { useUnitCode } from '../hooks/use-unit-detail';
import { useUnitInterdiff } from '../hooks/use-unit-interdiff';
import { buildUnitAreaCss, buildUnitAreas, firstAreaRowSelector, hasRowsOutsideUnits } from '../unit-areas.utils';
import { CodeFileBar } from './code-file-bar';
import { FileWithoutLines } from './file-without-lines';
import { UnitInterdiffView } from './unit-interdiff-view';

interface iUnitCodeViewProps {
  snapshotId: string;
  unit: iUnit;
  file: iSnapshotFile;
  onOpenInEditor: (path: string, line?: number) => void;
}

/**
 * The unit's file bar and its code, whole, with the changes marked. A unit edited since the reviewer
 * decided on it shows only what changed since then, with the whole change a click away.
 */
export function UnitCodeView({ snapshotId, unit, file, onOpenInEditor }: iUnitCodeViewProps) {
  const line = unit.newStartLine ?? unit.oldStartLine ?? 1;
  const interdiff = useUnitInterdiff(snapshotId, unit);
  const [scope, setScope] = useState<CodeScope>(CODE_SCOPES['since-review']);
  const isSinceReview = interdiff.reviewed !== undefined && scope === CODE_SCOPES['since-review'];
  const expansion = useCodeExpansion([unit.id]);
  const { detail, isCut } = useUnitCode(snapshotId, [unit.id], expansion.isExpanded);
  const widePatch = detail?.patch && hasRowsOutsideUnits(detail.patch, [unit]) ? detail.patch : undefined;
  const areas = buildUnitAreas([unit]);
  const scrollRef = useScrollToCodeRow(widePatch ? firstAreaRowSelector(widePatch, areas) : undefined);

  return (
    <>
      <CodeFileBar
        snapshotId={snapshotId}
        file={file}
        line={line}
        onOpenInEditor={onOpenInEditor}
        expansion={detail?.patch && !isSinceReview ? expansion : undefined}
      >
        {interdiff.reviewed ? (
          <SegmentedControl
            label="Compare"
            options={codeScopeValues.map((value) => ({ value, label: CODE_SCOPE_LABELS.get(value) }))}
            value={scope}
            onChange={setScope}
          />
        ) : null}
      </CodeFileBar>
      <div ref={scrollRef} className="max-h-[46vh] scrollbar-gutter-stable overflow-auto bg-canvas">
        {isSinceReview ? <UnitInterdiffView unit={unit} file={file} interdiff={interdiff} /> : null}
        {!isSinceReview && detail === undefined ? <DiffSkeleton /> : null}
        {!isSinceReview && detail?.patch ? (
          <PatchView
            snapshotId={snapshotId}
            file={file}
            patch={detail.patch}
            layout={DIFF_LAYOUTS.unified}
            isWrapped={false}
            isCut={isCut}
            extraCss={widePatch ? buildUnitAreaCss(widePatch, areas) : undefined}
          />
        ) : null}
        {!isSinceReview && detail && !detail.patch ? <FileWithoutLines snapshotId={snapshotId} file={file} /> : null}
      </div>
    </>
  );
}

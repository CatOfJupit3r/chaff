import { DIFF_LAYOUTS } from '@chaff/common/enums/diff.enums';

import { PatchView } from '@~/features/reviews/components/patch-view';
import { DiffSkeleton } from '@~/features/reviews/components/skeleton-components';
import type { iSnapshotFile, iUnit } from '@~/features/reviews/reviews.types';

import { useCodeExpansion } from '../hooks/use-code-expansion';
import { useScrollToCodeRow } from '../hooks/use-scroll-to-code-row';
import { useUnitDetail } from '../hooks/use-unit-detail';
import { buildUnitAreaCss, buildUnitAreas, firstAreaRowSelector } from '../unit-areas.utils';
import { CodeFileBar } from './code-file-bar';
import { FileWithoutLines } from './file-without-lines';
import { UnitAreaLegend } from './unit-area-legend';

interface iChangeFileCodeProps {
  snapshotId: string;
  /** Units of the change that are in this file; more than one. */
  units: readonly iUnit[];
  file: iSnapshotFile;
  onOpenInEditor: (path: string, line?: number) => void;
}

/** Several units of a change that share a file: the file once, with each unit outlined in its own color. */
export function ChangeFileCode({ snapshotId, units, file, onOpenInEditor }: iChangeFileCodeProps) {
  const unitIds = units.map((unit) => unit.id);
  const { data: detail } = useUnitDetail(snapshotId, unitIds);
  const expansion = useCodeExpansion(unitIds);
  const areas = buildUnitAreas(units);
  const first = areas[0]?.unit;
  const areaCss = detail?.patch ? buildUnitAreaCss(detail.patch, areas) : undefined;
  const scrollRef = useScrollToCodeRow(detail?.patch ? firstAreaRowSelector(detail.patch, areas) : undefined);

  return (
    <section aria-label={file.path}>
      <UnitAreaLegend areas={areas} />
      <CodeFileBar
        snapshotId={snapshotId}
        file={file}
        line={first?.newStartLine ?? first?.oldStartLine ?? 1}
        onOpenInEditor={onOpenInEditor}
        expansion={detail?.patch ? expansion : undefined}
      />
      <div ref={scrollRef} className="max-h-[46vh] scrollbar-gutter-stable overflow-auto bg-canvas">
        {detail === undefined ? <DiffSkeleton /> : null}
        {detail?.patch ? (
          <PatchView
            snapshotId={snapshotId}
            file={file}
            patch={detail.patch}
            layout={DIFF_LAYOUTS.unified}
            isWrapped={false}
            isExpanded={expansion.isExpanded}
            extraCss={areaCss}
          />
        ) : null}
        {detail && !detail.patch ? <FileWithoutLines snapshotId={snapshotId} file={file} /> : null}
      </div>
    </section>
  );
}

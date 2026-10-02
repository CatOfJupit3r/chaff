import { DIFF_SIDES } from '@chaff/common/enums/review.enums';

import { ContentsDiff } from '@~/features/reviews/components/contents-diff';
import { DiffSkeleton } from '@~/features/reviews/components/skeleton-components';
import { spliceLines } from '@~/features/reviews/contents-splice.utils';
import { DIFF_LAYOUTS } from '@~/features/reviews/reviews.enums';
import type { iSnapshotFile, iUnit } from '@~/features/reviews/reviews.types';

import type { useUnitInterdiff } from '../hooks/use-unit-interdiff';

interface iUnitInterdiffViewProps {
  unit: iUnit;
  file: iSnapshotFile;
  interdiff: ReturnType<typeof useUnitInterdiff>;
}

/** The unit as the reviewer last decided on it against the unit now, inside the file as it is now. */
export function UnitInterdiffView({ unit, file, interdiff }: iUnitInterdiffViewProps) {
  const { reviewed, contents } = interdiff;
  if (!reviewed || !contents) return <DiffSkeleton />;
  const isNewSide = reviewed.side === DIFF_SIDES.NEW;
  const current = (isNewSide ? contents.newContents : contents.oldContents) ?? '';
  const start = (isNewSide ? unit.newStartLine : unit.oldStartLine) ?? 1;
  const end = (isNewSide ? unit.newEndLine : unit.oldEndLine) ?? start - 1;

  return (
    <ContentsDiff
      path={file.path}
      oldContents={spliceLines(current, start, end, reviewed.text)}
      newContents={current}
      layout={DIFF_LAYOUTS.unified}
    />
  );
}

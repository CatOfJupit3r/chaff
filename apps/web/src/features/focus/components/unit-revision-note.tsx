import { Pill } from '@~/components/ui/pill';
import type { iUnit } from '@~/features/reviews/reviews.types';

import { UNIT_REVISION_LABELS, UNIT_REVISION_NOTES, UNIT_REVISION_PILLS } from '../focus.enums';

/** How the unit compares with the previous version of the review, when that matters for the decision. */
export function UnitRevisionNote({ unit, version }: { unit: iUnit; version: number }) {
  const note = unit.revision ? UNIT_REVISION_NOTES.get(unit.revision) : undefined;
  if (!unit.revision || !note) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-canvas px-[22px] py-[9px] text-[12.5px] text-muted">
      <Pill variant={UNIT_REVISION_PILLS.get(unit.revision)}>{UNIT_REVISION_LABELS.get(unit.revision)}</Pill>
      <span>{note(version)}</span>
    </div>
  );
}

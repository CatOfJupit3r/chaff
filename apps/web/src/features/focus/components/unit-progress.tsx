import type { iUnit } from '@~/features/reviews/reviews.types';
import { cn } from '@~/lib/utils';

import { UNIT_MARK_LABELS, UNIT_MARK_SEGMENT_CLASSES } from '../focus.enums';

/** Above this many units the segments touch, and the current one is drawn taller instead of outlined. */
const SPACED_UNIT_LIMIT = 40;
const THIN_GAP_UNIT_LIMIT = 200;

function gapClass(unitCount: number) {
  if (unitCount <= SPACED_UNIT_LIMIT) return 'gap-1';
  return unitCount <= THIN_GAP_UNIT_LIMIT ? 'gap-px' : 'gap-0';
}

interface iUnitProgressProps {
  units: readonly iUnit[];
  index: number;
  onJump: (index: number) => void;
}

/** One segment per unit, colored by its mark; click a segment to open that unit. */
export function UnitProgress({ units, index, onJump }: iUnitProgressProps) {
  const isSpaced = units.length <= SPACED_UNIT_LIMIT;

  return (
    <div
      role="group"
      aria-label="Units"
      className={cn('flex h-[13px] min-w-40 flex-1 items-center', gapClass(units.length))}
    >
      {units.map((unit, unitIndex) => {
        const isCurrent = unitIndex === index;
        const label = `${unitIndex + 1}: ${unit.title}${unit.mark ? `, ${UNIT_MARK_LABELS(unit.mark)}` : ''}`;
        return (
          <button
            key={unit.id}
            type="button"
            title={label}
            aria-label={`Unit ${label}`}
            aria-current={isCurrent ? 'step' : undefined}
            tabIndex={isCurrent ? 0 : -1}
            onClick={() => onJump(unitIndex)}
            className={cn(
              'h-[5px] min-w-0 flex-1 bg-line-strong p-0',
              isSpaced ? 'rounded-[3px]' : 'rounded-none',
              unit.mark && UNIT_MARK_SEGMENT_CLASSES(unit.mark),
              isCurrent &&
                (isSpaced ? 'outline-[1.5px] outline-offset-2 outline-fg outline-solid' : 'h-[13px] min-w-[3px] bg-fg'),
            )}
          />
        );
      })}
    </div>
  );
}

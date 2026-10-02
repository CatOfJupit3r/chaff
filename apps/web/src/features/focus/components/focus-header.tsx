import { LeftIcon, PanelIcon, RightIcon, UndoIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { Pill } from '@~/components/ui/pill';
import type { iUnit } from '@~/features/reviews/reviews.types';

import { FOCUS_QUEUE_PILLS } from '../focus.enums';
import type { FocusQueue } from '../focus.enums';
import { UnitProgress } from './unit-progress';

interface iFocusHeaderProps {
  units: readonly iUnit[];
  index: number;
  queue: FocusQueue;
  canUndo: boolean;
  isContextOpen: boolean;
  onMove: (delta: number) => void;
  onJump: (index: number) => void;
  onUndo: () => void;
  onToggleContext: () => void;
  onLeaveQueue: () => void;
}

/** Previous and next, where the card sits among the units, and Undo. */
export function FocusHeader({
  units,
  index,
  queue,
  canUndo,
  isContextOpen,
  onMove,
  onJump,
  onUndo,
  onToggleContext,
  onLeaveQueue,
}: iFocusHeaderProps) {
  const position = Math.min(index + 1, units.length);
  const queuePill = FOCUS_QUEUE_PILLS(queue);

  return (
    <div className="mb-[18px] flex w-full max-w-[920px] flex-wrap items-center gap-3.5">
      <Button variant="icon" size="icon" aria-label="Previous unit" onClick={() => onMove(-1)}>
        <LeftIcon />
      </Button>
      <span className="min-w-[72px] text-center font-mono text-[12.5px] whitespace-nowrap text-muted tabular-nums">
        {position} of {units.length}
      </span>
      <Button variant="icon" size="icon" aria-label="Next unit" onClick={() => onMove(1)}>
        <RightIcon />
      </Button>
      <UnitProgress units={units} index={index} onJump={onJump} />
      {queuePill ? (
        <button type="button" onClick={onLeaveQueue} title="Back to units without a decision">
          <Pill variant="neutral">{queuePill}</Pill>
        </button>
      ) : null}
      <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo}>
        <UndoIcon />
        Undo
      </Button>
      <Button variant="ghost" size="sm" aria-pressed={isContextOpen} onClick={onToggleContext}>
        <PanelIcon />
        Context
      </Button>
    </div>
  );
}

import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';
import { reviewProgressionValues } from '@chaff/common/enums/review.enums';
import type { ReviewProgression } from '@chaff/common/enums/review.enums';
import { SHORTCUT_ACTIONS } from '@chaff/common/enums/shortcuts.enums';

import { LeftIcon, PanelIcon, RightIcon, UndoIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { Pill } from '@~/components/ui/pill';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { ShortcutKbd } from '@~/features/settings/components/shortcut-kbd';

import type { iFocusCard } from '../focus-cards.utils';
import { FOCUS_QUEUE_PILLS, REVIEW_PROGRESSION_LABELS } from '../focus.enums';
import type { FocusQueue } from '../focus.enums';
import { UnitProgress } from './unit-progress';

interface iFocusHeaderProps {
  cards: readonly iFocusCard[];
  index: number;
  progression: ReviewProgression;
  queue: FocusQueue;
  canUndo: boolean;
  isContextOpen: boolean;
  onMove: (delta: number) => void;
  onJump: (index: number) => void;
  onUndo: () => void;
  onToggleContext: () => void;
  onLeaveQueue: () => void;
  onProgression: (progression: ReviewProgression) => void;
}

/** Previous and next, where the card sits among the cards, the progression, and Undo. */
export function FocusHeader({
  cards,
  index,
  progression,
  queue,
  canUndo,
  isContextOpen,
  onMove,
  onJump,
  onUndo,
  onToggleContext,
  onLeaveQueue,
  onProgression,
}: iFocusHeaderProps) {
  const position = Math.min(index + 1, cards.length);
  const queuePill = FOCUS_QUEUE_PILLS.get(queue);

  return (
    <div className="mb-[18px] flex w-full max-w-[920px] flex-wrap items-center gap-3.5">
      <Button
        variant="ghost"
        size="sm"
        aria-label="Previous card"
        title="Previous card, also ←"
        onClick={() => onMove(-1)}
      >
        <LeftIcon />
        <ShortcutKbd action={SHORTCUT_ACTIONS.FOCUS_PREVIOUS} className="h-4 min-w-4 text-[10px]" />
      </Button>
      <span className="min-w-[72px] text-center font-mono text-[12.5px] whitespace-nowrap text-muted tabular-nums">
        {position} of {cards.length}
      </span>
      <Button variant="ghost" size="sm" aria-label="Next card" title="Next card, also →" onClick={() => onMove(1)}>
        <ShortcutKbd action={SHORTCUT_ACTIONS.FOCUS_NEXT} className="h-4 min-w-4 text-[10px]" />
        <RightIcon />
      </Button>
      <UnitProgress cards={cards} index={index} onJump={onJump} />
      {queuePill ? (
        <button type="button" onClick={onLeaveQueue} title="Back to units without a decision">
          <Pill variant="neutral">{queuePill}</Pill>
        </button>
      ) : null}
      <div data-onboarding={ONBOARDING_ITEMS.PROGRESSION} className="flex self-center">
        <SegmentedControl
          label="Progression"
          options={reviewProgressionValues.map((value) => ({ value, label: REVIEW_PROGRESSION_LABELS.get(value) }))}
          value={progression}
          onChange={onProgression}
        />
      </div>
      <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo}>
        <UndoIcon />
        Undo
        <ShortcutKbd action={SHORTCUT_ACTIONS.FOCUS_UNDO} className="h-4 min-w-4 text-[10px]" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={isContextOpen}
        data-onboarding={ONBOARDING_ITEMS.CONTEXT}
        onClick={onToggleContext}
      >
        <PanelIcon />
        Context
        <ShortcutKbd action={SHORTCUT_ACTIONS.FOCUS_CONTEXT} className="h-4 min-w-4 text-[10px]" />
      </Button>
    </div>
  );
}

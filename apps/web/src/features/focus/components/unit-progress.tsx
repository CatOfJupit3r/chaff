import { cn } from '@~/lib/utils';

import { cardMark } from '../focus-cards.utils';
import type { iFocusCard } from '../focus-cards.utils';
import { UNIT_MARK_LABELS, UNIT_MARK_SEGMENT_CLASSES } from '../focus.enums';

/** Above this many cards the segments touch, and the current one is drawn taller instead of outlined. */
const SPACED_UNIT_LIMIT = 40;
const THIN_GAP_UNIT_LIMIT = 200;

function gapClass(cardCount: number) {
  if (cardCount <= SPACED_UNIT_LIMIT) return 'gap-1';
  return cardCount <= THIN_GAP_UNIT_LIMIT ? 'gap-px' : 'gap-0';
}

interface iUnitProgressProps {
  cards: readonly iFocusCard[];
  index: number;
  onJump: (index: number) => void;
}

/** One segment per card, colored by the mark its units share; click a segment to open that card. */
export function UnitProgress({ cards, index, onJump }: iUnitProgressProps) {
  const isSpaced = cards.length <= SPACED_UNIT_LIMIT;

  return (
    <div
      role="group"
      aria-label="Cards"
      className={cn('flex h-[13px] min-w-40 flex-1 items-center', gapClass(cards.length))}
    >
      {cards.map((card, cardIndex) => {
        const isCurrent = cardIndex === index;
        const mark = cardMark(card);
        const label = `${cardIndex + 1}: ${card.title}${mark ? `, ${UNIT_MARK_LABELS(mark)}` : ''}`;
        return (
          <button
            key={card.id}
            type="button"
            title={label}
            aria-label={`Card ${label}`}
            aria-current={isCurrent ? 'step' : undefined}
            tabIndex={isCurrent ? 0 : -1}
            onClick={() => onJump(cardIndex)}
            className={cn(
              'h-[5px] min-w-0 flex-1 bg-line-strong p-0',
              isSpaced ? 'rounded-[3px]' : 'rounded-none',
              mark && UNIT_MARK_SEGMENT_CLASSES(mark),
              isCurrent &&
                (isSpaced ? 'outline-[1.5px] outline-offset-2 outline-fg outline-solid' : 'h-[13px] min-w-[3px] bg-fg'),
            )}
          />
        );
      })}
    </div>
  );
}

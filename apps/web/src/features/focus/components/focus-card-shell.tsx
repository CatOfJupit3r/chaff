import type { ReactNode } from 'react';

import { cn } from '@~/lib/utils';

import { swipeExit } from '../focus-swipe.utils';
import { CARD_EXIT_CLASSES, CARD_EXITS } from '../focus.enums';
import type { CardExit } from '../focus.enums';
import { useCardSwipe } from '../hooks/use-card-swipe';

interface iFocusCardShellProps {
  label: string;
  exit?: CardExit;
  /** A finger or pen let go of the card past the edge: right means Looks good, left means Concern. */
  onSwipe?: (exit: CardExit) => unknown;
  children: ReactNode;
}

/** Card border while dragged far enough that letting go decides. */
const SWIPE_BORDER_CLASSES = new Map<CardExit | undefined, string>([
  [CARD_EXITS.RIGHT, 'border-good'],
  [CARD_EXITS.LEFT, 'border-warn'],
]);

/** The Focus card itself: it can be swiped, and it leaves the way the decision on it points. */
export function FocusCardShell({ label, exit, onSwipe, children }: iFocusCardShellProps) {
  const swipe = useCardSwipe(onSwipe);

  return (
    <article
      aria-label={label}
      {...swipe.handlers}
      style={swipe.isDragging ? { translate: `${swipe.offset}px 0`, rotate: `${swipe.offset / 70}deg` } : undefined}
      className={cn(
        'relative z-1 animate-card-in touch-pan-y overflow-hidden rounded-xl border border-line-strong bg-surface shadow-modal',
        'transition-[translate,rotate,scale,opacity,border-color] duration-280 ease-[cubic-bezier(.3,.7,.3,1)]',
        swipe.isDragging && 'transition-[border-color] duration-150',
        SWIPE_BORDER_CLASSES.get(swipeExit(swipe.offset)),
        exit && CARD_EXIT_CLASSES(exit),
      )}
    >
      {children}
    </article>
  );
}

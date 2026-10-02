import { UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { useShortcutKeys } from '@~/hooks/use-shortcut-keys';

import { cardViewValues } from '../focus.enums';
import type { CardView } from '../focus.enums';
import type { CommentMark } from './use-focus-review';

interface iFocusKeyHandlers {
  hasCard: boolean;
  onLooksGood: () => void;
  onLater: () => void;
  onComment: (mark: CommentMark) => void;
  onMove: (delta: number) => void;
  onUndo: () => void;
  onToggleContext: () => void;
  onView: (view: CardView) => void;
}

/** 1 to 4 pick the card's views in tab order. */
const VIEW_KEYS = new Map(cardViewValues.map((view, index) => [String(index + 1), view]));

function actionFor(key: string, handlers: iFocusKeyHandlers): (() => unknown) | undefined {
  if (key === 'arrowright' || key === 'j') return () => handlers.onMove(1);
  if (key === 'arrowleft' || key === 'k') return () => handlers.onMove(-1);
  if (key === 'u') return handlers.onUndo;
  if (key === 'i') return handlers.onToggleContext;
  if (!handlers.hasCard) return undefined;
  if (key === 'g') return handlers.onLooksGood;
  if (key === 'l') return handlers.onLater;
  if (key === 'c') return () => handlers.onComment(UNIT_MARKS.CONCERN);
  if (key === 'q') return () => handlers.onComment(UNIT_MARKS.QUESTION);
  const view = VIEW_KEYS.get(key);
  return view ? () => handlers.onView(view) : undefined;
}

/** Focus review keys: G, C, Q, L decide; arrows or J/K move; U undoes; I opens context; 1-4 switch views. */
export function useFocusKeyboard(handlers: iFocusKeyHandlers) {
  useShortcutKeys((key) => actionFor(key, handlers));
}

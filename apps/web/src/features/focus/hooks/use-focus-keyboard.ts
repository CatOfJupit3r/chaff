import { UNIT_MARKS } from '@chaff/common/enums/review.enums';
import { SHORTCUT_ACTIONS, SHORTCUT_SCREENS } from '@chaff/common/enums/shortcuts.enums';
import type { ShortcutAction } from '@chaff/common/enums/shortcuts.enums';

import { useShortcutBindings } from '@~/features/settings/hooks/use-shortcut-bindings';
import { findShortcutAction } from '@~/features/settings/shortcuts.utils';
import { useShortcutKeys } from '@~/hooks/use-shortcut-keys';

import { cardViewValues } from '../focus.enums';
import type { CardView } from '../focus.enums';
import type { CommentMark } from './use-focus-review';

interface iFocusKeyHandlers {
  hasCard: boolean;
  onLooksGood: () => unknown;
  onLater: () => unknown;
  onComment: (mark: CommentMark) => unknown;
  onMove: (delta: number) => unknown;
  onUndo: () => unknown;
  onToggleContext: () => unknown;
  onView: (view: CardView) => unknown;
}

/** 1 to 4 pick the card's views in tab order. */
const VIEW_KEYS = new Map(cardViewValues.map((view, index) => [String(index + 1), view]));

/** Arrows always move, next to the keys picked in Settings. */
const ARROW_ACTIONS = new Map<string, ShortcutAction>([
  ['arrowright', SHORTCUT_ACTIONS.FOCUS_NEXT],
  ['arrowleft', SHORTCUT_ACTIONS.FOCUS_PREVIOUS],
]);

function handlersByAction(handlers: iFocusKeyHandlers) {
  const always = new Map<ShortcutAction, () => unknown>([
    [SHORTCUT_ACTIONS.FOCUS_NEXT, () => handlers.onMove(1)],
    [SHORTCUT_ACTIONS.FOCUS_PREVIOUS, () => handlers.onMove(-1)],
    [SHORTCUT_ACTIONS.FOCUS_UNDO, handlers.onUndo],
    [SHORTCUT_ACTIONS.FOCUS_CONTEXT, handlers.onToggleContext],
  ]);
  if (!handlers.hasCard) return always;
  return new Map<ShortcutAction, () => unknown>([
    ...always,
    [SHORTCUT_ACTIONS.FOCUS_LOOKS_GOOD, handlers.onLooksGood],
    [SHORTCUT_ACTIONS.FOCUS_LATER, handlers.onLater],
    [SHORTCUT_ACTIONS.FOCUS_CONCERN, () => handlers.onComment(UNIT_MARKS.CONCERN)],
    [SHORTCUT_ACTIONS.FOCUS_QUESTION, () => handlers.onComment(UNIT_MARKS.QUESTION)],
  ]);
}

function actionFor(key: string, handlers: iFocusKeyHandlers, keys: ReadonlyMap<ShortcutAction, string>) {
  const action = ARROW_ACTIONS.get(key) ?? findShortcutAction(keys, SHORTCUT_SCREENS.FOCUS, key);
  if (action) return handlersByAction(handlers).get(action);
  const view = handlers.hasCard ? VIEW_KEYS.get(key) : undefined;
  return view ? () => handlers.onView(view) : undefined;
}

/** Focus review keys from Settings (G, C, Q, L decide; J/K move; U undoes; I opens context), arrows and 1-4. */
export function useFocusKeyboard(handlers: iFocusKeyHandlers) {
  const keys = useShortcutBindings();
  useShortcutKeys((key) => actionFor(key, handlers, keys));
}

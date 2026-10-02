import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import type { Values } from 'nuqs';

import { REVIEW_PROGRESSIONS, reviewProgressionValues } from '@chaff/common/enums/review.enums';

import { CARD_VIEWS, cardViewValues, FOCUS_QUEUES, focusQueueValues } from '../focus.enums';

const focusPositionParsers = {
  /** A card's id, or a unit's id, which opens the card holding it. */
  unit: parseAsString,
  progression: parseAsStringLiteral(reviewProgressionValues).withDefault(REVIEW_PROGRESSIONS.changes),
  queue: parseAsStringLiteral(focusQueueValues).withDefault(FOCUS_QUEUES.open),
  view: parseAsStringLiteral(cardViewValues).withDefault(CARD_VIEWS.code),
};

/** The card, the progression and queue Next walks, and the card's view, kept in the URL. */
export function useFocusPosition() {
  const [state, setState] = useQueryStates(focusPositionParsers, { history: 'replace' });

  // nuqs applies the change to the URL in the background; nothing waits for it.
  const update = (patch: Partial<Values<typeof focusPositionParsers>>) => {
    setState(patch).catch(() => undefined);
  };

  return { ...state, update };
}

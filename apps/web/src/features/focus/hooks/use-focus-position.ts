import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import type { Values } from 'nuqs';
import { useMemo } from 'react';

import { reviewProgressionValues } from '@chaff/common/enums/review.enums';
import type { ReviewProgression } from '@chaff/common/enums/review.enums';

import { useSettings } from '@~/features/settings/hooks/use-settings';

import { CARD_VIEWS, cardViewValues, FOCUS_QUEUES, focusQueueValues } from '../focus.enums';

function focusPositionParsers(progression: ReviewProgression) {
  return {
    /** A card's id, or a unit's id, which opens the card holding it. */
    unit: parseAsString,
    progression: parseAsStringLiteral(reviewProgressionValues).withDefault(progression),
    queue: parseAsStringLiteral(focusQueueValues).withDefault(FOCUS_QUEUES.open),
    view: parseAsStringLiteral(cardViewValues).withDefault(CARD_VIEWS.code),
  };
}

/**
 * The card, the progression and queue Next walks, and the card's view, kept in the URL. The progression starts
 * as the one picked in settings.
 */
export function useFocusPosition() {
  const { defaultProgression } = useSettings();
  const parsers = useMemo(() => focusPositionParsers(defaultProgression), [defaultProgression]);
  const [state, setState] = useQueryStates(parsers, { history: 'replace' });

  // nuqs applies the change to the URL in the background; nothing waits for it.
  const update = (patch: Partial<Values<ReturnType<typeof focusPositionParsers>>>) => {
    setState(patch).catch(() => undefined);
  };

  return { ...state, update };
}

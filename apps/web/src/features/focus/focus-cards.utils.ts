import { REVIEW_PROGRESSIONS, UNIT_KINDS, UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { ReviewProgression, UnitMark } from '@chaff/common/enums/review.enums';

import type { iChangeUnit } from '@~/features/change-units/change-units.types';
import type { iUnit } from '@~/features/reviews/reviews.types';

import { needsRecheck } from './focus-queue.utils';
import { FOCUS_QUEUES } from './focus.enums';
import type { FocusQueue } from './focus.enums';

/** URL value of the card shown after the last one. */
export const FOCUS_END = 'end';

/** What one Focus card reviews: a Change unit's units, or a single Function or Section unit. */
export interface iFocusCard {
  /** The Change unit's id, or the unit's id. */
  id: string;
  title: string;
  units: iUnit[];
  change?: iChangeUnit;
}

const unitCard = (unit: iUnit): iFocusCard => ({ id: unit.id, title: unit.title, units: [unit] });

/**
 * The cards Focus walks for a progression. Changes puts each Change unit first and then every unit no change
 * covers, so nothing is out of reach; Units shows every unit on its own card, and Functions and Sections one
 * kind of unit each.
 */
export function buildFocusCards(
  units: readonly iUnit[],
  changes: readonly iChangeUnit[],
  progression: ReviewProgression,
): iFocusCard[] {
  if (progression === REVIEW_PROGRESSIONS.units) return units.map(unitCard);
  if (progression === REVIEW_PROGRESSIONS.functions) {
    return units.filter((unit) => unit.kind === UNIT_KINDS.FUNCTION).map(unitCard);
  }
  if (progression === REVIEW_PROGRESSIONS.sections) {
    return units.filter((unit) => unit.kind === UNIT_KINDS.SECTION).map(unitCard);
  }
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const grouped = new Set(changes.flatMap((change) => change.unitIds));
  const changeCards = changes.flatMap((change): iFocusCard[] => {
    const members = change.unitIds.flatMap((unitId) => byId.get(unitId) ?? []);
    return members.length > 0 ? [{ id: change.id, title: change.title, units: members, change }] : [];
  });
  return [...changeCards, ...units.filter((unit) => !grouped.has(unit.id)).map(unitCard)];
}

/** The mark every unit of the card shares; undefined while any is undecided or they differ. */
export function cardMark(card: iFocusCard): UnitMark | undefined {
  const [first, ...rest] = card.units;
  const mark = first?.mark;
  return rest.every((unit) => unit.mark === mark) ? mark : undefined;
}

function isQueued(card: iFocusCard, queue: FocusQueue) {
  if (queue === FOCUS_QUEUES.later) return card.units.some((unit) => unit.mark === UNIT_MARKS.LATER);
  if (queue === FOCUS_QUEUES.recheck) return card.units.some(needsRecheck);
  return card.units.some((unit) => unit.mark === undefined);
}

/**
 * The next card in the queue after `fromIndex`, wrapping round to pick up cards that were skipped.
 * Returns `cards.length`, the end card, when the queue is empty.
 */
export function findNextIndex(cards: readonly iFocusCard[], fromIndex: number, queue: FocusQueue) {
  for (let offset = 1; offset <= cards.length; offset += 1) {
    const index = (fromIndex + offset) % cards.length;
    const card = cards[index];
    if (index !== fromIndex && card && isQueued(card, queue)) return index;
  }
  return cards.length;
}

/**
 * The card to show: the end card, the card named in the URL or holding the unit named there, or the first
 * card still in the queue.
 */
export function resolveIndex(cards: readonly iFocusCard[], param: string | null, queue: FocusQueue) {
  if (param === FOCUS_END) return cards.length;
  const named = param
    ? cards.findIndex((card) => card.id === param || card.units.some((unit) => unit.id === param))
    : -1;
  return named === -1 ? findNextIndex(cards, -1, queue) : named;
}

/** The cards with the marks applied, so the next card is picked from the decisions just made. */
export function withMarks(cards: readonly iFocusCard[], marks: ReadonlyMap<string, UnitMark | undefined>) {
  return cards.map((card) => ({
    ...card,
    units: card.units.map((unit) =>
      marks.has(unit.id) ? { ...unit, mark: marks.get(unit.id), isMarkCarried: false } : unit,
    ),
  }));
}

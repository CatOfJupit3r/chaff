import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';

import {
  REVIEW_PROGRESSIONS,
  reviewProgressionsEnumwaii,
  FILE_KINDS,
  fileKindsEnumwaii,
  SYMBOL_KINDS,
  symbolKindsEnumwaii,
  UNIT_CHANGES,
  UNIT_KINDS,
  UNIT_MARKS,
  UNIT_REVISIONS,
  unitChangesEnumwaii,
  unitKindsEnumwaii,
  unitMarksEnumwaii,
  unitRevisionsEnumwaii,
} from '@chaff/common/enums/review.enums';

// Card views and queues are lowercase because they appear in the URL.
export const cardViewsEnumwaii = em(['code', 'usages', 'diagram', 'tests', 'qa']);

export const CARD_VIEWS = cardViewsEnumwaii.enum;
export type CardView = InferEnumwaii<typeof cardViewsEnumwaii>;
export const cardViewValues = cardViewsEnumwaii.values;

export const CARD_VIEW_LABELS = cardViewsEnumwaii.derive(
  [CARD_VIEWS.code, 'Code'],
  [CARD_VIEWS.usages, 'Usages'],
  [CARD_VIEWS.diagram, 'Diagram'],
  [CARD_VIEWS.tests, 'Tests'],
  [CARD_VIEWS.qa, 'Q&A'],
);

/**
 * Which units Next walks through: the ones without a decision, the ones put off with Later, or the ones
 * whose kept mark should be rechecked because something they use changed.
 */
export const focusQueuesEnumwaii = em(['open', 'later', 'recheck']);

export const FOCUS_QUEUES = focusQueuesEnumwaii.enum;
export type FocusQueue = InferEnumwaii<typeof focusQueuesEnumwaii>;
export const focusQueueValues = focusQueuesEnumwaii.values;

/** Pill shown in the Focus header while walking a queue other than the open units. */
export const FOCUS_QUEUE_PILLS = focusQueuesEnumwaii.derive(
  [FOCUS_QUEUES.open, undefined],
  [FOCUS_QUEUES.later, 'Later queue'],
  [FOCUS_QUEUES.recheck, 'Recheck queue'],
);

/** Short label on a card for how its unit compares with the previous snapshot. */
export const UNIT_REVISION_LABELS = unitRevisionsEnumwaii.derive(
  [UNIT_REVISIONS.UNCHANGED, 'Unchanged'],
  [UNIT_REVISIONS.EDITED, 'Edited'],
  [UNIT_REVISIONS.NEW, 'New in this version'],
  [UNIT_REVISIONS.POSSIBLY_AFFECTED, 'Possibly affected'],
);

/** What a card says about a unit that changed, or did not, since the previous version of the review. */
export const UNIT_REVISION_NOTES = unitRevisionsEnumwaii.derive<((version: number) => string) | undefined>()(
  [UNIT_REVISIONS.UNCHANGED, undefined],
  [
    UNIT_REVISIONS.EDITED,
    (version) =>
      `Edited in version ${version}. A decision on the earlier code no longer counts; the code shows what changed since you last decided.`,
  ],
  [UNIT_REVISIONS.NEW, (version) => `New in version ${version}.`],
  [
    UNIT_REVISIONS.POSSIBLY_AFFECTED,
    (version) =>
      `Unchanged, but it uses code that changed in version ${version}. Best effort, by name: check your decision still holds.`,
  ],
);

/** `Pill` variant for each revision. */
export const UNIT_REVISION_PILLS = unitRevisionsEnumwaii.derive(
  [UNIT_REVISIONS.UNCHANGED, 'neutral'],
  [UNIT_REVISIONS.EDITED, 'fix'],
  [UNIT_REVISIONS.NEW, 'fix'],
  [UNIT_REVISIONS.POSSIBLY_AFFECTED, 'open'],
);

/** What the code view of an edited unit compares: the code since the reviewer's decision, or the whole change. */
export const codeScopesEnumwaii = em(['since-review', 'whole']);

export const CODE_SCOPES = codeScopesEnumwaii.enum;
export type CodeScope = InferEnumwaii<typeof codeScopesEnumwaii>;
export const codeScopeValues = codeScopesEnumwaii.values;

export const CODE_SCOPE_LABELS = codeScopesEnumwaii.derive(
  [CODE_SCOPES['since-review'], 'Since your decision'],
  [CODE_SCOPES.whole, 'Whole change'],
);

/** Where a card leaves to after a decision. */
export const cardExitsEnumwaii = em(['RIGHT', 'LEFT', 'DOWN']);

export const CARD_EXITS = cardExitsEnumwaii.enum;
export type CardExit = InferEnumwaii<typeof cardExitsEnumwaii>;

export const CARD_EXIT_CLASSES = cardExitsEnumwaii.derive(
  [CARD_EXITS.RIGHT, 'translate-x-[70px] rotate-[1.6deg] opacity-0'],
  [CARD_EXITS.LEFT, '-translate-x-[70px] -rotate-[1.6deg] opacity-0'],
  [CARD_EXITS.DOWN, 'translate-y-10 scale-[0.98] opacity-0'],
);

export const UNIT_MARK_LABELS = unitMarksEnumwaii.derive(
  [UNIT_MARKS.LOOKS_GOOD, 'Looks good'],
  [UNIT_MARKS.CONCERN, 'Concern'],
  [UNIT_MARKS.QUESTION, 'Question'],
  [UNIT_MARKS.LATER, 'Later'],
  [UNIT_MARKS.SKIPPED, 'Skipped'],
);

/** Where a card leaves to after the mark; a concern or question keeps the card up. */
export const UNIT_MARK_EXITS = unitMarksEnumwaii.derive<CardExit | undefined>()(
  [UNIT_MARKS.LOOKS_GOOD, CARD_EXITS.RIGHT],
  [UNIT_MARKS.CONCERN, undefined],
  [UNIT_MARKS.QUESTION, undefined],
  [UNIT_MARKS.LATER, CARD_EXITS.DOWN],
  [UNIT_MARKS.SKIPPED, CARD_EXITS.DOWN],
);

/** Progress segment color for each mark; Later is striped with the `bg-stripes` utility. */
export const UNIT_MARK_SEGMENT_CLASSES = unitMarksEnumwaii.derive(
  [UNIT_MARKS.LOOKS_GOOD, 'bg-good'],
  [UNIT_MARKS.CONCERN, 'bg-warn'],
  [UNIT_MARKS.QUESTION, 'bg-accent'],
  [UNIT_MARKS.LATER, 'bg-later bg-stripes'],
  [UNIT_MARKS.SKIPPED, 'bg-skip'],
);

export const UNIT_CHANGE_LABELS = unitChangesEnumwaii.derive(
  [UNIT_CHANGES.ADDED, 'New'],
  [UNIT_CHANGES.MODIFIED, 'Changed'],
  [UNIT_CHANGES.REMOVED, 'Removed'],
);

export const SYMBOL_KIND_LABELS = symbolKindsEnumwaii.derive(
  [SYMBOL_KINDS.FUNCTION, 'function'],
  [SYMBOL_KINDS.METHOD, 'method'],
  [SYMBOL_KINDS.CLASS, 'class'],
  [SYMBOL_KINDS.INTERFACE, 'interface'],
  [SYMBOL_KINDS.TYPE, 'type'],
  [SYMBOL_KINDS.ENUM, 'enum'],
  [SYMBOL_KINDS.STRUCT, 'struct'],
  [SYMBOL_KINDS.TRAIT, 'trait'],
  [SYMBOL_KINDS.IMPL, 'impl'],
  [SYMBOL_KINDS.MODULE, 'module'],
  [SYMBOL_KINDS.VARIABLE, 'variable'],
  [SYMBOL_KINDS.TEST, 'test'],
);

export const UNIT_KIND_LABELS = unitKindsEnumwaii.derive(
  [UNIT_KINDS.FUNCTION, 'Function'],
  [UNIT_KINDS.SECTION, 'Section'],
);

/** Card fact for files that are not plain source. */
export const FILE_KIND_FACTS = fileKindsEnumwaii.derive(
  [FILE_KINDS.SOURCE, undefined],
  [FILE_KINDS.TEST, 'test file'],
  [FILE_KINDS.CONFIG, 'config'],
  [FILE_KINDS.DOCS, 'docs'],
  [FILE_KINDS.GENERATED, 'generated'],
  [FILE_KINDS.BINARY, 'binary'],
);

export const REVIEW_PROGRESSION_LABELS = reviewProgressionsEnumwaii.derive(
  [REVIEW_PROGRESSIONS.changes, 'Changes'],
  [REVIEW_PROGRESSIONS.units, 'Units'],
  [REVIEW_PROGRESSIONS.functions, 'Functions'],
  [REVIEW_PROGRESSIONS.sections, 'Sections'],
);

/**
 * What a concern or question written in Focus is about: the card's units, units picked by hand (from any
 * card), the whole branch, or the whole stack.
 */
export const noteScopesEnumwaii = em(['CARD', 'UNITS', 'BRANCH', 'STACK']);

export const NOTE_SCOPES = noteScopesEnumwaii.enum;
export type NoteScope = InferEnumwaii<typeof noteScopesEnumwaii>;
export const noteScopeValues = noteScopesEnumwaii.values;

export const NOTE_SCOPE_LABELS = noteScopesEnumwaii.derive(
  [NOTE_SCOPES.CARD, 'This card'],
  [NOTE_SCOPES.UNITS, 'Pick units…'],
  [NOTE_SCOPES.BRANCH, 'Whole branch'],
  [NOTE_SCOPES.STACK, 'Whole stack'],
);

/** The composer's footer for a note that is not pinned to lines. */
export const NOTE_SCOPE_FOOTERS = noteScopesEnumwaii.derive<string | undefined>()(
  [NOTE_SCOPES.CARD, undefined],
  [NOTE_SCOPES.UNITS, undefined],
  [NOTE_SCOPES.BRANCH, "About the whole branch, so it isn't pinned to lines. The card stays up."],
  [NOTE_SCOPES.STACK, 'About the whole stack: the other branches in it show it too. The card stays up.'],
);

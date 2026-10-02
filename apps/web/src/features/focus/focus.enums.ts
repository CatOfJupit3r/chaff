import {
  FILE_KINDS,
  fileKindsEnumwaii,
  SYMBOL_KINDS,
  symbolKindsEnumwaii,
  UNIT_CHANGES,
  UNIT_KINDS,
  UNIT_MARKS,
  unitChangesEnumwaii,
  unitKindsEnumwaii,
  unitMarksEnumwaii,
} from '@chaff/common/enums/review.enums';
import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

// Card views and queues are lowercase because they appear in the URL.
export const cardViewsEnumwaii = new Enumwaii('CardView', ['code', 'usages', 'diagram', 'tests']);

export const CARD_VIEWS = cardViewsEnumwaii.enum;
export type CardView = InferEnumwaii<typeof cardViewsEnumwaii>;
export const cardViewValues = cardViewsEnumwaii.values;

export const CARD_VIEW_LABELS = cardViewsEnumwaii.derive({
  [CARD_VIEWS.code]: 'Code',
  [CARD_VIEWS.usages]: 'Usages',
  [CARD_VIEWS.diagram]: 'Diagram',
  [CARD_VIEWS.tests]: 'Tests',
});

/** Which units Next walks through: the ones without a decision, or the ones put off with Later. */
export const focusQueuesEnumwaii = new Enumwaii('FocusQueue', ['open', 'later']);

export const FOCUS_QUEUES = focusQueuesEnumwaii.enum;
export type FocusQueue = InferEnumwaii<typeof focusQueuesEnumwaii>;
export const focusQueueValues = focusQueuesEnumwaii.values;

/** Where a card leaves to after a decision. */
export const cardExitsEnumwaii = new Enumwaii('CardExit', ['RIGHT', 'LEFT', 'DOWN']);

export const CARD_EXITS = cardExitsEnumwaii.enum;
export type CardExit = InferEnumwaii<typeof cardExitsEnumwaii>;

export const CARD_EXIT_CLASSES = cardExitsEnumwaii.derive({
  [CARD_EXITS.RIGHT]: 'translate-x-[70px] rotate-[1.6deg] opacity-0',
  [CARD_EXITS.LEFT]: '-translate-x-[70px] -rotate-[1.6deg] opacity-0',
  [CARD_EXITS.DOWN]: 'translate-y-10 scale-[0.98] opacity-0',
});

export const UNIT_MARK_LABELS = unitMarksEnumwaii.derive({
  [UNIT_MARKS.LOOKS_GOOD]: 'Looks good',
  [UNIT_MARKS.CONCERN]: 'Concern',
  [UNIT_MARKS.QUESTION]: 'Question',
  [UNIT_MARKS.LATER]: 'Later',
});

export const UNIT_MARK_EXITS = unitMarksEnumwaii.derive({
  [UNIT_MARKS.LOOKS_GOOD]: CARD_EXITS.RIGHT,
  [UNIT_MARKS.CONCERN]: CARD_EXITS.LEFT,
  [UNIT_MARKS.QUESTION]: CARD_EXITS.LEFT,
  [UNIT_MARKS.LATER]: CARD_EXITS.DOWN,
});

/** Progress segment color for each mark; Later is striped with the `bg-stripes` utility. */
export const UNIT_MARK_SEGMENT_CLASSES = unitMarksEnumwaii.derive({
  [UNIT_MARKS.LOOKS_GOOD]: 'bg-good',
  [UNIT_MARKS.CONCERN]: 'bg-warn',
  [UNIT_MARKS.QUESTION]: 'bg-accent',
  [UNIT_MARKS.LATER]: 'bg-later bg-stripes',
});

export const UNIT_CHANGE_LABELS = unitChangesEnumwaii.derive({
  [UNIT_CHANGES.ADDED]: 'New',
  [UNIT_CHANGES.MODIFIED]: 'Changed',
  [UNIT_CHANGES.REMOVED]: 'Removed',
});

export const SYMBOL_KIND_LABELS = symbolKindsEnumwaii.derive({
  [SYMBOL_KINDS.FUNCTION]: 'function',
  [SYMBOL_KINDS.METHOD]: 'method',
  [SYMBOL_KINDS.CLASS]: 'class',
  [SYMBOL_KINDS.INTERFACE]: 'interface',
  [SYMBOL_KINDS.TYPE]: 'type',
  [SYMBOL_KINDS.ENUM]: 'enum',
  [SYMBOL_KINDS.STRUCT]: 'struct',
  [SYMBOL_KINDS.TRAIT]: 'trait',
  [SYMBOL_KINDS.IMPL]: 'impl',
  [SYMBOL_KINDS.MODULE]: 'module',
  [SYMBOL_KINDS.VARIABLE]: 'variable',
  [SYMBOL_KINDS.TEST]: 'test',
});

export const UNIT_KIND_LABELS = unitKindsEnumwaii.derive({
  [UNIT_KINDS.FUNCTION]: 'Function',
  [UNIT_KINDS.SECTION]: 'Section',
});

/** Card fact for files that are not plain source. */
export const FILE_KIND_FACTS = fileKindsEnumwaii.derive({
  [FILE_KINDS.SOURCE]: undefined,
  [FILE_KINDS.TEST]: 'test file',
  [FILE_KINDS.CONFIG]: 'config',
  [FILE_KINDS.DOCS]: 'docs',
  [FILE_KINDS.GENERATED]: 'generated',
  [FILE_KINDS.BINARY]: 'binary',
});

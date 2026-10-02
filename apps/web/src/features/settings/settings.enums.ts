import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

/** Whitespace-only changes in diffs, as a choice. */
export const whitespaceChoicesEnumwaii = new Enumwaii('WhitespaceChoice', ['SHOW', 'IGNORE']);

export const WHITESPACE_CHOICES = whitespaceChoicesEnumwaii.enum;
export type WhitespaceChoice = InferEnumwaii<typeof whitespaceChoicesEnumwaii>;
export const whitespaceChoiceValues = whitespaceChoicesEnumwaii.values;

export const WHITESPACE_CHOICE_LABELS = whitespaceChoicesEnumwaii.derive({
  [WHITESPACE_CHOICES.SHOW]: 'Show',
  [WHITESPACE_CHOICES.IGNORE]: 'Ignore',
});

/** When the Focus context panel opens, as a choice. */
export const contextPanelChoicesEnumwaii = new Enumwaii('ContextPanelChoice', ['ON_DEMAND', 'PINNED']);

export const CONTEXT_PANEL_CHOICES = contextPanelChoicesEnumwaii.enum;
export type ContextPanelChoice = InferEnumwaii<typeof contextPanelChoicesEnumwaii>;
export const contextPanelChoiceValues = contextPanelChoicesEnumwaii.values;

export const CONTEXT_PANEL_CHOICE_LABELS = contextPanelChoicesEnumwaii.derive({
  [CONTEXT_PANEL_CHOICES.ON_DEMAND]: 'When asked',
  [CONTEXT_PANEL_CHOICES.PINNED]: 'Always open',
});

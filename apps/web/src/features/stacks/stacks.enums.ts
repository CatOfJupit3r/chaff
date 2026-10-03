import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';

// Lowercase because the view appears in the URL.
/** A branch's own changes against its parent, or everything the stack adds up to it against the stack's base. */
export const stackViewsEnumwaii = em(['own', 'cumulative']);

export const STACK_VIEWS = stackViewsEnumwaii.enum;
export type StackView = InferEnumwaii<typeof stackViewsEnumwaii>;
export const stackViewValues = stackViewsEnumwaii.values;

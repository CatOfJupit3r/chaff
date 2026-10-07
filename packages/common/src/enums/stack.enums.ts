import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** The end of a stack a branch is added to: on top, where branches merge into it, or at the bottom. */
export const stackEndsEnumwaii = em(['TOP', 'BOTTOM']);

export const STACK_ENDS = stackEndsEnumwaii.enum;
export type StackEnd = InferEnumwaii<typeof stackEndsEnumwaii>;
export const stackEndSchema = emToZodSchema(stackEndsEnumwaii);

/** Where a suggestion for the next branch of a stack comes from: the code host's open changes, or the history. */
export const stackSuggestionSourcesEnumwaii = em(['HOST', 'HISTORY']);

export const STACK_SUGGESTION_SOURCES = stackSuggestionSourcesEnumwaii.enum;
export type StackSuggestionSource = InferEnumwaii<typeof stackSuggestionSourcesEnumwaii>;
export const stackSuggestionSourceSchema = emToZodSchema(stackSuggestionSourcesEnumwaii);

/**
 * How the code host differs from a stack: an open change now targets the stack's top branch, or a branch's change
 * targets another branch than the one it merges into in the stack.
 */
export const stackHostChangeKindsEnumwaii = em(['ADDED_ON_TOP', 'RETARGETED']);

export const STACK_HOST_CHANGE_KINDS = stackHostChangeKindsEnumwaii.enum;
export type StackHostChangeKind = InferEnumwaii<typeof stackHostChangeKindsEnumwaii>;
export const stackHostChangeKindSchema = emToZodSchema(stackHostChangeKindsEnumwaii);

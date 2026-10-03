import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

// Layout values are lowercase because they appear in the URL.
export const diffLayoutsEnumwaii = em(['unified', 'split']);

export const DIFF_LAYOUTS = diffLayoutsEnumwaii.enum;
export type DiffLayout = InferEnumwaii<typeof diffLayoutsEnumwaii>;
export const diffLayoutSchema = emToZodSchema(diffLayoutsEnumwaii);
export const diffLayoutValues = diffLayoutsEnumwaii.values;

export const DIFF_LAYOUT_LABELS = diffLayoutsEnumwaii.derive(
  [DIFF_LAYOUTS.unified, 'Unified'],
  [DIFF_LAYOUTS.split, 'Split'],
);

/** Unchanged lines shown around each change. */
export const diffContextsEnumwaii = em(['THREE', 'FIVE', 'TEN', 'WHOLE_FILE']);

export const DIFF_CONTEXTS = diffContextsEnumwaii.enum;
export type DiffContext = InferEnumwaii<typeof diffContextsEnumwaii>;
export const diffContextSchema = emToZodSchema(diffContextsEnumwaii);
export const diffContextValues = diffContextsEnumwaii.values;

export const DIFF_CONTEXT_LABELS = diffContextsEnumwaii.derive(
  [DIFF_CONTEXTS.THREE, '3 lines'],
  [DIFF_CONTEXTS.FIVE, '5 lines'],
  [DIFF_CONTEXTS.TEN, '10 lines'],
  [DIFF_CONTEXTS.WHOLE_FILE, 'Whole file'],
);

/** Lines of context git writes into the patch; the whole file is shown by unfolding instead. */
export const DIFF_CONTEXT_LINES = diffContextsEnumwaii.derive(
  [DIFF_CONTEXTS.THREE, 3],
  [DIFF_CONTEXTS.FIVE, 5],
  [DIFF_CONTEXTS.TEN, 10],
  [DIFF_CONTEXTS.WHOLE_FILE, 3],
);

/** How changes inside a changed line are marked. */
export const inlineDiffsEnumwaii = em(['WORD', 'CHARACTER', 'NONE']);

export const INLINE_DIFFS = inlineDiffsEnumwaii.enum;
export type InlineDiff = InferEnumwaii<typeof inlineDiffsEnumwaii>;
export const inlineDiffSchema = emToZodSchema(inlineDiffsEnumwaii);
export const inlineDiffValues = inlineDiffsEnumwaii.values;

export const INLINE_DIFF_LABELS = inlineDiffsEnumwaii.derive(
  [INLINE_DIFFS.WORD, 'Words'],
  [INLINE_DIFFS.CHARACTER, 'Characters'],
  [INLINE_DIFFS.NONE, 'Off'],
);

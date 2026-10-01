import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

export const diffLineTypesEnumwaii = new Enumwaii('DiffLineType', ['CONTEXT', 'ADDED', 'DELETED']);

export const DIFF_LINE_TYPES = diffLineTypesEnumwaii.enum;
export type DiffLineType = InferEnumwaii<typeof diffLineTypesEnumwaii>;

/** One-character prefix used when hashing changed lines, matching the unified diff markers. */
export const DIFF_LINE_MARKERS = diffLineTypesEnumwaii.derive({
  [DIFF_LINE_TYPES.CONTEXT]: ' ',
  [DIFF_LINE_TYPES.ADDED]: '+',
  [DIFF_LINE_TYPES.DELETED]: '-',
});

import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/**
 * Where a branch's parent comes from: the target branch of its open merge or pull request, which everyone on
 * the project sees; the parent the user confirmed; or Chaff's suggestion from the history.
 */
export const branchParentSourcesEnumwaii = em(['CHANGE_REQUEST', 'CONFIRMED', 'SUGGESTED']);

export const BRANCH_PARENT_SOURCES = branchParentSourcesEnumwaii.enum;
export type BranchParentSource = InferEnumwaii<typeof branchParentSourcesEnumwaii>;
export const branchParentSourceSchema = emToZodSchema(branchParentSourcesEnumwaii);

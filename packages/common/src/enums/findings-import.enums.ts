import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Why an imported anchor could not be placed on the snapshot. */
export const importedAnchorProblemsEnumwaii = em(['FILE_NOT_IN_CHANGE', 'NO_TEXT_DIFF', 'LINES_OUTSIDE_CHANGE']);

export const IMPORTED_ANCHOR_PROBLEMS = importedAnchorProblemsEnumwaii.enum;
export type ImportedAnchorProblem = InferEnumwaii<typeof importedAnchorProblemsEnumwaii>;
export const importedAnchorProblemSchema = emToZodSchema(importedAnchorProblemsEnumwaii);

export const IMPORTED_ANCHOR_PROBLEM_LABELS = importedAnchorProblemsEnumwaii.derive(
  [IMPORTED_ANCHOR_PROBLEMS.FILE_NOT_IN_CHANGE, 'the file is not part of this change'],
  [IMPORTED_ANCHOR_PROBLEMS.NO_TEXT_DIFF, 'the file has no text diff (binary or too large)'],
  [IMPORTED_ANCHOR_PROBLEMS.LINES_OUTSIDE_CHANGE, 'the lines are outside the diff of the file'],
);

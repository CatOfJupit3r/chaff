import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';

import { FILE_STATUSES, fileStatusesEnumwaii, REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';
import type { ReviewTargetKind } from '@chaff/common/enums/review.enums';

// Diff mode and tree view values are lowercase because they appear in the URL.
export const diffModesEnumwaii = em(['file', 'all']);

export const DIFF_MODES = diffModesEnumwaii.enum;
export type DiffMode = InferEnumwaii<typeof diffModesEnumwaii>;
export const diffModeValues = diffModesEnumwaii.values;

export const DIFF_MODE_LABELS = diffModesEnumwaii.derive([DIFF_MODES.file, 'One file'], [DIFF_MODES.all, 'All files']);

export const fileTreeViewsEnumwaii = em(['tree', 'list']);

export const FILE_TREE_VIEWS = fileTreeViewsEnumwaii.enum;
export type FileTreeView = InferEnumwaii<typeof fileTreeViewsEnumwaii>;
export const fileTreeViewValues = fileTreeViewsEnumwaii.values;

export const FILE_TREE_VIEW_LABELS = fileTreeViewsEnumwaii.derive(
  [FILE_TREE_VIEWS.tree, 'Tree'],
  [FILE_TREE_VIEWS.list, 'List'],
);

/** How a changed file is shown in the diff. */
export const fileDisplaysEnumwaii = em([
  'DIFF',
  'GENERATED',
  'LARGE',
  'TOO_LARGE',
  'BINARY',
  'IMAGE',
  'RENAME_ONLY',
  'MODE_ONLY',
  'EMPTY',
]);

export const FILE_DISPLAYS = fileDisplaysEnumwaii.enum;
export type FileDisplay = InferEnumwaii<typeof fileDisplaysEnumwaii>;

/** Whether a file that can be drawn shows its changed lines or the drawn result. */
export const fileBodyViewsEnumwaii = em(['DIFF', 'PREVIEW']);

export const FILE_BODY_VIEWS = fileBodyViewsEnumwaii.enum;
export type FileBodyView = InferEnumwaii<typeof fileBodyViewsEnumwaii>;
export const fileBodyViewValues = fileBodyViewsEnumwaii.values;

export const FILE_BODY_VIEW_LABELS = fileBodyViewsEnumwaii.derive(
  [FILE_BODY_VIEWS.DIFF, 'Diff'],
  [FILE_BODY_VIEWS.PREVIEW, 'Preview'],
);

/** How the two versions of a changed image are put together. */
export const imageComparisonsEnumwaii = em(['BOTH', 'SWIPE', 'FADE']);

export const IMAGE_COMPARISONS = imageComparisonsEnumwaii.enum;
export type ImageComparison = InferEnumwaii<typeof imageComparisonsEnumwaii>;
export const imageComparisonValues = imageComparisonsEnumwaii.values;

export const IMAGE_COMPARISON_LABELS = imageComparisonsEnumwaii.derive(
  [IMAGE_COMPARISONS.BOTH, 'Both'],
  [IMAGE_COMPARISONS.SWIPE, 'Swipe'],
  [IMAGE_COMPARISONS.FADE, 'Fade'],
);

/** How far the reviewer got through a file's units. */
export const fileDecisionsEnumwaii = em(['NONE', 'PARTIAL', 'LOOKS_GOOD', 'CONCERN']);

export const FILE_DECISIONS = fileDecisionsEnumwaii.enum;
export type FileDecision = InferEnumwaii<typeof fileDecisionsEnumwaii>;

export const FILE_DECISION_LABELS = fileDecisionsEnumwaii.derive(
  [FILE_DECISIONS.NONE, 'Not reviewed'],
  [FILE_DECISIONS.PARTIAL, 'Partly reviewed'],
  [FILE_DECISIONS.LOOKS_GOOD, 'Looks good'],
  [FILE_DECISIONS.CONCERN, 'Has a concern or question'],
);

export const FILE_DECISION_DOTS = fileDecisionsEnumwaii.derive(
  [FILE_DECISIONS.NONE, 'border-[1.5px] border-faint'],
  [FILE_DECISIONS.PARTIAL, 'border-[1.5px] border-good'],
  [FILE_DECISIONS.LOOKS_GOOD, 'bg-good'],
  [FILE_DECISIONS.CONCERN, 'bg-warn'],
);

/** The one-letter status git tools show beside a changed file. */
export const FILE_STATUS_LETTERS = fileStatusesEnumwaii.derive(
  [FILE_STATUSES.ADDED, 'A'],
  [FILE_STATUSES.MODIFIED, 'M'],
  [FILE_STATUSES.DELETED, 'D'],
  [FILE_STATUSES.RENAMED, 'R'],
  [FILE_STATUSES.TYPE_CHANGED, 'T'],
);

export const FILE_STATUS_TONES = fileStatusesEnumwaii.derive(
  [FILE_STATUSES.ADDED, 'text-good'],
  [FILE_STATUSES.MODIFIED, 'text-warn'],
  [FILE_STATUSES.DELETED, 'text-bad'],
  [FILE_STATUSES.RENAMED, 'text-accent'],
  [FILE_STATUSES.TYPE_CHANGED, 'text-muted'],
);

export const FILE_STATUS_BADGES = fileStatusesEnumwaii.derive(
  [FILE_STATUSES.ADDED, 'border-good-line bg-good-soft text-good'],
  [FILE_STATUSES.MODIFIED, 'border-warn-line bg-warn-soft text-warn'],
  [FILE_STATUSES.DELETED, 'border-bad-line bg-bad-soft text-bad'],
  [FILE_STATUSES.RENAMED, 'border-accent-line bg-accent-soft text-accent'],
  [FILE_STATUSES.TYPE_CHANGED, 'border-line-strong bg-raised text-muted'],
);

/** Marks a review that is not a branch's own changes. */
export const REVIEW_TARGET_KIND_PILLS = new Map<ReviewTargetKind, string>([
  [REVIEW_TARGET_KINDS.WORKING_CHANGES, 'working changes'],
  [REVIEW_TARGET_KINDS.CUMULATIVE, 'cumulative'],
]);

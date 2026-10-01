import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

// Diff mode, layout and tree view values are lowercase because they appear in the URL.
export const diffModesEnumwaii = new Enumwaii('DiffMode', ['file', 'all']);

export const DIFF_MODES = diffModesEnumwaii.enum;
export type DiffMode = InferEnumwaii<typeof diffModesEnumwaii>;
export const diffModeValues = diffModesEnumwaii.values;

export const DIFF_MODE_LABELS = diffModesEnumwaii.derive({
  [DIFF_MODES.file]: 'One file',
  [DIFF_MODES.all]: 'All files',
});

export const diffLayoutsEnumwaii = new Enumwaii('DiffLayout', ['unified', 'split']);

export const DIFF_LAYOUTS = diffLayoutsEnumwaii.enum;
export type DiffLayout = InferEnumwaii<typeof diffLayoutsEnumwaii>;
export const diffLayoutValues = diffLayoutsEnumwaii.values;

export const DIFF_LAYOUT_LABELS = diffLayoutsEnumwaii.derive({
  [DIFF_LAYOUTS.unified]: 'Unified',
  [DIFF_LAYOUTS.split]: 'Split',
});

export const fileTreeViewsEnumwaii = new Enumwaii('FileTreeView', ['tree', 'list']);

export const FILE_TREE_VIEWS = fileTreeViewsEnumwaii.enum;
export type FileTreeView = InferEnumwaii<typeof fileTreeViewsEnumwaii>;
export const fileTreeViewValues = fileTreeViewsEnumwaii.values;

export const FILE_TREE_VIEW_LABELS = fileTreeViewsEnumwaii.derive({
  [FILE_TREE_VIEWS.tree]: 'Tree',
  [FILE_TREE_VIEWS.list]: 'List',
});

/** How a changed file is shown in the diff. */
export const fileDisplaysEnumwaii = new Enumwaii('FileDisplay', [
  'DIFF',
  'GENERATED',
  'LARGE',
  'TOO_LARGE',
  'BINARY',
  'RENAME_ONLY',
  'MODE_ONLY',
  'EMPTY',
]);

export const FILE_DISPLAYS = fileDisplaysEnumwaii.enum;
export type FileDisplay = InferEnumwaii<typeof fileDisplaysEnumwaii>;

/** How far the reviewer got through a file's units. */
export const fileDecisionsEnumwaii = new Enumwaii('FileDecision', ['NONE', 'PARTIAL', 'LOOKS_GOOD', 'CONCERN']);

export const FILE_DECISIONS = fileDecisionsEnumwaii.enum;
export type FileDecision = InferEnumwaii<typeof fileDecisionsEnumwaii>;

export const FILE_DECISION_LABELS = fileDecisionsEnumwaii.derive({
  [FILE_DECISIONS.NONE]: 'Not reviewed',
  [FILE_DECISIONS.PARTIAL]: 'Partly reviewed',
  [FILE_DECISIONS.LOOKS_GOOD]: 'Looks good',
  [FILE_DECISIONS.CONCERN]: 'Has a concern or question',
});

export const FILE_DECISION_DOTS = fileDecisionsEnumwaii.derive({
  [FILE_DECISIONS.NONE]: 'border-[1.5px] border-faint',
  [FILE_DECISIONS.PARTIAL]: 'border-[1.5px] border-good',
  [FILE_DECISIONS.LOOKS_GOOD]: 'bg-good',
  [FILE_DECISIONS.CONCERN]: 'bg-warn',
});

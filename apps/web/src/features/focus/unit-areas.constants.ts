import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';

/** How the diff renderer types a shown line (`data-line-type`); the values are the renderer's own. */
export const patchRowTypesEnumwaii = em(['change-addition', 'change-deletion', 'context']);

export const PATCH_ROW_TYPES = patchRowTypesEnumwaii.enum;
export type PatchRowType = InferEnumwaii<typeof patchRowTypesEnumwaii>;

/** Number of `--area-N` theme colors that unit areas cycle through. */
export const AREA_COLOR_COUNT = 4;

/** How far a nested unit's outline sits inside the outline around it. */
export const AREA_LAYER_INSET_PX = 4;

/** Corner radius of a unit's outline. */
export const AREA_RADIUS_PX = 6;

/** Strength of the tint inside a unit's outline, in percent of its color. */
export const AREA_FILL_PERCENT = 6;

/**
 * Pseudo-element that draws a nested unit's outline on a row; the row itself draws the outermost unit's, and
 * its `::before` is the renderer's own +/- marker.
 */
export const AREA_INNER_PSEUDO = '::after';

/** Tailwind background class of each `--area-N` color, in order. */
export const AREA_SWATCH_CLASSES = ['bg-area-1', 'bg-area-2', 'bg-area-3', 'bg-area-4'] as const;

/** Indent of a legend entry per unit it sits inside. */
export const AREA_LEGEND_INDENT_PX = 14;

/** Space kept above the first outlined row when the code scrolls to it. */
export const AREA_SCROLL_MARGIN_PX = 8;

/** Animation frames to wait for the diff renderer to draw the row to scroll to. */
export const AREA_SCROLL_MAX_FRAMES = 120;

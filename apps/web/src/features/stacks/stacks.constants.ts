/** The faint, dashed look of an empty end of a stack; it only brightens under the pointer or while open. */
export const GHOST_SLOT_CLASS =
  'rounded-lg border border-dashed border-line text-left text-faint opacity-70 transition-[opacity,border-color,color] hover:border-line-strong hover:text-muted hover:opacity-100 focus-visible:opacity-100 data-open:border-accent-line data-open:text-muted data-open:opacity-100';

/** Wheel movement, in pixels, that steps the stack train one branch along. */
export const TRAIN_WHEEL_STEP = 40;

/** How long the train ignores the wheel after a step, so one flick moves one branch. */
export const TRAIN_WHEEL_COOLDOWN_MS = 380;

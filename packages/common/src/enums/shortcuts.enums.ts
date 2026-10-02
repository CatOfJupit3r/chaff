import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

/** Screens that have their own keyboard map. */
export const shortcutScreensEnumwaii = new Enumwaii('ShortcutScreen', ['FOCUS', 'VERIFY']);

export const SHORTCUT_SCREENS = shortcutScreensEnumwaii.enum;
export type ShortcutScreen = InferEnumwaii<typeof shortcutScreensEnumwaii>;
export const shortcutScreenValues = shortcutScreensEnumwaii.values;

export const SHORTCUT_SCREEN_LABELS = shortcutScreensEnumwaii.derive({
  [SHORTCUT_SCREENS.FOCUS]: 'Focus review',
  [SHORTCUT_SCREENS.VERIFY]: 'Verify',
});

/** Keys every screen uses: / opens Jump to, ? lists the keys. */
export const GLOBAL_SHORTCUT_KEYS: readonly string[] = ['/', '?'];

/** Keys a screen keeps for itself: Focus switches the card's views with 1 to 4. */
export const RESERVED_SHORTCUT_KEYS = shortcutScreensEnumwaii.derive<readonly string[]>({
  [SHORTCUT_SCREENS.FOCUS]: ['1', '2', '3', '4', ...GLOBAL_SHORTCUT_KEYS],
  [SHORTCUT_SCREENS.VERIFY]: GLOBAL_SHORTCUT_KEYS,
});

/** Actions that can be given another key in Settings. */
export const shortcutActionsEnumwaii = new Enumwaii('ShortcutAction', [
  'FOCUS_NEXT',
  'FOCUS_PREVIOUS',
  'FOCUS_LOOKS_GOOD',
  'FOCUS_CONCERN',
  'FOCUS_QUESTION',
  'FOCUS_LATER',
  'FOCUS_SKIP',
  'FOCUS_UNDO',
  'FOCUS_CONTEXT',
  'FOCUS_EXPAND',
  'VERIFY_NEXT',
  'VERIFY_PREVIOUS',
  'VERIFY_VERIFY',
  'VERIFY_REOPEN',
  'VERIFY_CLOSE',
  'VERIFY_WITHDRAW',
]);

export const SHORTCUT_ACTIONS = shortcutActionsEnumwaii.enum;
export type ShortcutAction = InferEnumwaii<typeof shortcutActionsEnumwaii>;
export const shortcutActionSchema = shortcutActionsEnumwaii.schema;
export const shortcutActionValues = shortcutActionsEnumwaii.values;

export const SHORTCUT_ACTION_SCREENS = shortcutActionsEnumwaii.derive({
  [SHORTCUT_ACTIONS.FOCUS_NEXT]: SHORTCUT_SCREENS.FOCUS,
  [SHORTCUT_ACTIONS.FOCUS_PREVIOUS]: SHORTCUT_SCREENS.FOCUS,
  [SHORTCUT_ACTIONS.FOCUS_LOOKS_GOOD]: SHORTCUT_SCREENS.FOCUS,
  [SHORTCUT_ACTIONS.FOCUS_CONCERN]: SHORTCUT_SCREENS.FOCUS,
  [SHORTCUT_ACTIONS.FOCUS_QUESTION]: SHORTCUT_SCREENS.FOCUS,
  [SHORTCUT_ACTIONS.FOCUS_LATER]: SHORTCUT_SCREENS.FOCUS,
  [SHORTCUT_ACTIONS.FOCUS_SKIP]: SHORTCUT_SCREENS.FOCUS,
  [SHORTCUT_ACTIONS.FOCUS_UNDO]: SHORTCUT_SCREENS.FOCUS,
  [SHORTCUT_ACTIONS.FOCUS_CONTEXT]: SHORTCUT_SCREENS.FOCUS,
  [SHORTCUT_ACTIONS.FOCUS_EXPAND]: SHORTCUT_SCREENS.FOCUS,
  [SHORTCUT_ACTIONS.VERIFY_NEXT]: SHORTCUT_SCREENS.VERIFY,
  [SHORTCUT_ACTIONS.VERIFY_PREVIOUS]: SHORTCUT_SCREENS.VERIFY,
  [SHORTCUT_ACTIONS.VERIFY_VERIFY]: SHORTCUT_SCREENS.VERIFY,
  [SHORTCUT_ACTIONS.VERIFY_REOPEN]: SHORTCUT_SCREENS.VERIFY,
  [SHORTCUT_ACTIONS.VERIFY_CLOSE]: SHORTCUT_SCREENS.VERIFY,
  [SHORTCUT_ACTIONS.VERIFY_WITHDRAW]: SHORTCUT_SCREENS.VERIFY,
});

export const SHORTCUT_ACTION_LABELS = shortcutActionsEnumwaii.derive({
  [SHORTCUT_ACTIONS.FOCUS_NEXT]: 'Next card',
  [SHORTCUT_ACTIONS.FOCUS_PREVIOUS]: 'Previous card',
  [SHORTCUT_ACTIONS.FOCUS_LOOKS_GOOD]: 'Looks good',
  [SHORTCUT_ACTIONS.FOCUS_CONCERN]: 'Concern',
  [SHORTCUT_ACTIONS.FOCUS_QUESTION]: 'Question',
  [SHORTCUT_ACTIONS.FOCUS_LATER]: 'Later',
  [SHORTCUT_ACTIONS.FOCUS_SKIP]: 'Skip',
  [SHORTCUT_ACTIONS.FOCUS_UNDO]: 'Undo',
  [SHORTCUT_ACTIONS.FOCUS_CONTEXT]: 'Context panel',
  [SHORTCUT_ACTIONS.FOCUS_EXPAND]: 'Whole file around the code',
  [SHORTCUT_ACTIONS.VERIFY_NEXT]: 'Next finding',
  [SHORTCUT_ACTIONS.VERIFY_PREVIOUS]: 'Previous finding',
  [SHORTCUT_ACTIONS.VERIFY_VERIFY]: 'Verify fix',
  [SHORTCUT_ACTIONS.VERIFY_REOPEN]: 'Reopen',
  [SHORTCUT_ACTIONS.VERIFY_CLOSE]: 'Close',
  [SHORTCUT_ACTIONS.VERIFY_WITHDRAW]: 'Withdraw',
});

/** Lower-cased `KeyboardEvent.key` of each action until the user picks another. */
export const DEFAULT_SHORTCUT_KEYS = shortcutActionsEnumwaii.derive({
  [SHORTCUT_ACTIONS.FOCUS_NEXT]: 'j',
  [SHORTCUT_ACTIONS.FOCUS_PREVIOUS]: 'k',
  [SHORTCUT_ACTIONS.FOCUS_LOOKS_GOOD]: 'g',
  [SHORTCUT_ACTIONS.FOCUS_CONCERN]: 'c',
  [SHORTCUT_ACTIONS.FOCUS_QUESTION]: 'q',
  [SHORTCUT_ACTIONS.FOCUS_LATER]: 'l',
  [SHORTCUT_ACTIONS.FOCUS_SKIP]: 's',
  [SHORTCUT_ACTIONS.FOCUS_UNDO]: 'u',
  [SHORTCUT_ACTIONS.FOCUS_CONTEXT]: 'i',
  [SHORTCUT_ACTIONS.FOCUS_EXPAND]: 'e',
  [SHORTCUT_ACTIONS.VERIFY_NEXT]: 'j',
  [SHORTCUT_ACTIONS.VERIFY_PREVIOUS]: 'k',
  [SHORTCUT_ACTIONS.VERIFY_VERIFY]: 'v',
  [SHORTCUT_ACTIONS.VERIFY_REOPEN]: 'r',
  [SHORTCUT_ACTIONS.VERIFY_CLOSE]: 'x',
  [SHORTCUT_ACTIONS.VERIFY_WITHDRAW]: 'w',
});

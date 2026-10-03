import {
  DEFAULT_SHORTCUT_KEYS,
  RESERVED_SHORTCUT_KEYS,
  SHORTCUT_ACTION_SCREENS,
  shortcutActionValues,
} from '../enums/shortcuts.enums';
import type { ShortcutAction } from '../enums/shortcuts.enums';

/** A key the user picked for an action; actions without one keep their default. */
export interface iShortcutBinding {
  action: ShortcutAction;
  /** Lower-cased `KeyboardEvent.key`. */
  key: string;
}

/** The key each action answers to. */
export function resolveShortcutKeys(bindings: readonly iShortcutBinding[]): ReadonlyMap<ShortcutAction, string> {
  const picked = new Map(bindings.map((binding) => [binding.action, binding.key]));
  return new Map(
    shortcutActionValues.map((action) => [action, picked.get(action) ?? DEFAULT_SHORTCUT_KEYS.get(action)]),
  );
}

/** Actions whose key another action on the same screen also uses, or that the screen keeps for itself. */
export function findShortcutConflicts(bindings: readonly iShortcutBinding[]): ShortcutAction[] {
  const keys = resolveShortcutKeys(bindings);
  return shortcutActionValues.filter((action) => {
    const key = keys.get(action);
    const screen = SHORTCUT_ACTION_SCREENS.get(action);
    if (key === undefined) return false;
    if (RESERVED_SHORTCUT_KEYS.get(screen).includes(key)) return true;
    return shortcutActionValues.some(
      (other) => other !== action && SHORTCUT_ACTION_SCREENS.get(other) === screen && keys.get(other) === key,
    );
  });
}

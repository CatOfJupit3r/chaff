import {
  DEFAULT_SHORTCUT_KEYS,
  RESERVED_SHORTCUT_KEYS,
  SHORTCUT_ACTION_LABELS,
  SHORTCUT_ACTION_SCREENS,
  shortcutActionValues,
} from '@chaff/common/enums/shortcuts.enums';
import type { ShortcutAction, ShortcutScreen } from '@chaff/common/enums/shortcuts.enums';
import type { iShortcutBinding } from '@chaff/common/helpers/shortcuts.helper';

const KEY_LABELS = new Map([
  ['arrowleft', '←'],
  ['arrowright', '→'],
  ['arrowup', '↑'],
  ['arrowdown', '↓'],
]);

/** How a key is printed on a `Kbd`. */
export function shortcutKeyLabel(key: string) {
  return KEY_LABELS.get(key) ?? key.toUpperCase();
}

/** The action a key triggers on a screen, if any. */
export function findShortcutAction(keys: ReadonlyMap<ShortcutAction, string>, screen: ShortcutScreen, key: string) {
  return shortcutActionValues.find((action) => SHORTCUT_ACTION_SCREENS(action) === screen && keys.get(action) === key);
}

/** The bindings with `action` on `key`; no key, or the default one, drops the custom binding. */
export function rebindShortcut(
  bindings: readonly iShortcutBinding[],
  action: ShortcutAction,
  key?: string,
): iShortcutBinding[] {
  const others = bindings.filter((binding) => binding.action !== action);
  return key === undefined || key === DEFAULT_SHORTCUT_KEYS(action) ? others : [...others, { action, key }];
}

/** Why `action` can't take `key` given the current keys, or nothing when it can. */
export function describeShortcutConflict(
  keys: ReadonlyMap<ShortcutAction, string>,
  action: ShortcutAction,
  key: string,
) {
  const screen = SHORTCUT_ACTION_SCREENS(action);
  if (RESERVED_SHORTCUT_KEYS(screen).includes(key)) return `${shortcutKeyLabel(key)} switches the card's views`;
  const taken = shortcutActionValues.find(
    (other) => other !== action && SHORTCUT_ACTION_SCREENS(other) === screen && keys.get(other) === key,
  );
  return taken ? `${shortcutKeyLabel(key)} is already ${SHORTCUT_ACTION_LABELS(taken)}` : undefined;
}

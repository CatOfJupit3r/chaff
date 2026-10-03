import { describe, expect, it } from 'vitest';

import { SHORTCUT_ACTIONS, SHORTCUT_SCREENS } from '@chaff/common/enums/shortcuts.enums';
import { resolveShortcutKeys } from '@chaff/common/helpers/shortcuts.helper';

import { describeShortcutConflict, findShortcutAction, rebindShortcut } from '@~/features/settings/shortcuts.utils';

describe('shortcuts', () => {
  it('finds the action of a rebound key on its own screen only', () => {
    const keys = resolveShortcutKeys([{ action: SHORTCUT_ACTIONS.FOCUS_LOOKS_GOOD, key: 'y' }]);

    expect(findShortcutAction(keys, SHORTCUT_SCREENS.FOCUS, 'y')).toBe(SHORTCUT_ACTIONS.FOCUS_LOOKS_GOOD);
    expect(findShortcutAction(keys, SHORTCUT_SCREENS.FOCUS, 'g')).toBeUndefined();
    expect(findShortcutAction(keys, SHORTCUT_SCREENS.VERIFY, 'y')).toBeUndefined();
    expect(findShortcutAction(keys, SHORTCUT_SCREENS.VERIFY, 'j')).toBe(SHORTCUT_ACTIONS.VERIFY_NEXT);
  });

  it('names the action or the view switch a key would clash with', () => {
    const keys = resolveShortcutKeys([]);

    expect(describeShortcutConflict(keys, SHORTCUT_ACTIONS.FOCUS_LATER, 'g')).toBe('G is already Looks good');
    expect(describeShortcutConflict(keys, SHORTCUT_ACTIONS.FOCUS_UNDO, '3')).toBe("3 switches the card's views");
    expect(describeShortcutConflict(keys, SHORTCUT_ACTIONS.VERIFY_CLOSE, '/')).toBe(
      '/ is kept for Jump to and the key list',
    );
    expect(describeShortcutConflict(keys, SHORTCUT_ACTIONS.FOCUS_LATER, 'e')).toBe(
      'E is already Whole file around the code',
    );
    expect(describeShortcutConflict(keys, SHORTCUT_ACTIONS.VERIFY_CLOSE, 'g')).toBeUndefined();
    expect(describeShortcutConflict(keys, SHORTCUT_ACTIONS.FOCUS_LATER, 'l')).toBeUndefined();
  });

  it('keeps only keys that differ from the default', () => {
    const bindings = rebindShortcut([], SHORTCUT_ACTIONS.FOCUS_LATER, 'b');
    expect(bindings).toEqual([{ action: SHORTCUT_ACTIONS.FOCUS_LATER, key: 'b' }]);

    expect(rebindShortcut(bindings, SHORTCUT_ACTIONS.FOCUS_LATER, 'l')).toEqual([]);
    expect(rebindShortcut(bindings, SHORTCUT_ACTIONS.FOCUS_LATER)).toEqual([]);
  });
});

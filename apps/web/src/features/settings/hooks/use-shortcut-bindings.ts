import { useMemo } from 'react';

import { resolveShortcutKeys } from '@chaff/common/helpers/shortcuts.helper';

import { useSettings } from './use-settings';

/** The key each rebindable action answers to, after the user's changes in Settings. */
export function useShortcutBindings() {
  const { shortcuts } = useSettings();
  return useMemo(() => resolveShortcutKeys(shortcuts), [shortcuts]);
}

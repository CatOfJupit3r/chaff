import { useEffect } from 'react';

import { THEME_MODES } from '@chaff/common/enums/appearance.enums';

import { useSettings } from '@~/features/settings/hooks/use-settings';
import { useIsSystemDark } from '@~/hooks/use-is-system-dark';

/** Mirrors the appearance settings onto <html>, where the theme tokens pick them up. */
export function useApplyAppearance() {
  const { theme, accent, codeSize } = useSettings();
  const isSystemDark = useIsSystemDark();
  const isDark = theme === THEME_MODES.DARK || (theme === THEME_MODES.SYSTEM && isSystemDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.dataset.accent = accent;
    root.dataset.codeSize = codeSize;
  }, [isDark, accent, codeSize]);
}

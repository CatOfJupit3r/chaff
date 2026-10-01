import { useEffect } from 'react';

import { useSettings } from '@~/features/settings/hooks/use-settings';

import { useIsDarkMode } from './use-is-dark-mode';

/** Mirrors the appearance settings onto <html>, where the theme tokens pick them up. */
export function useApplyAppearance() {
  const { accent, codeSize } = useSettings();
  const isDark = useIsDarkMode();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.dataset.accent = accent;
    root.dataset.codeSize = codeSize;
  }, [isDark, accent, codeSize]);
}

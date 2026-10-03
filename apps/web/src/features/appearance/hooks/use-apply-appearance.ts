import { useEffect } from 'react';

import { useSettings } from '@~/features/settings/hooks/use-settings';

import { useIsDarkMode } from './use-is-dark-mode';

/** Mirrors the appearance settings onto <html>, where the theme tokens pick them up. */
export function useApplyAppearance() {
  const { accent, codeSize, codeFont, codeLineHeight, density, syntaxLight, syntaxDark } = useSettings();
  const isDark = useIsDarkMode();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.dataset.accent = accent;
    root.dataset.codeSize = codeSize;
    root.dataset.codeFont = codeFont;
    root.dataset.codeLineHeight = codeLineHeight;
    root.dataset.density = density;
    root.dataset.syntaxLight = syntaxLight;
    root.dataset.syntaxDark = syntaxDark;
  }, [isDark, accent, codeSize, codeFont, codeLineHeight, density, syntaxLight, syntaxDark]);
}

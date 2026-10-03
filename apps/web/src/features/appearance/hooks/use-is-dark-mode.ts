import { THEME_MODES } from '@chaff/common/enums/appearance.enums';

import { useSettings } from '@~/features/settings/hooks/use-settings';
import { useIsSystemDark } from '@~/hooks/use-is-system-dark';

/** Whether the app is drawn in dark mode, following the OS when the theme is set to System. */
export function useIsDarkMode() {
  const { theme } = useSettings();
  const isSystemDark = useIsSystemDark();
  return theme === THEME_MODES.DARK || (theme === THEME_MODES.SYSTEM && isSystemDark);
}

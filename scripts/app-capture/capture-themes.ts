import { CAPTURE_THEME } from './app-capture.constants.ts';
import type { CaptureTheme } from './app-capture.constants.ts';

const THEME_FLAG = '--theme';

/** The themes asked for with `--theme light|dark`, or both. */
export function requestedThemes(): CaptureTheme[] {
  const flagIndex = process.argv.indexOf(THEME_FLAG);
  const requested = flagIndex === -1 ? null : process.argv[flagIndex + 1];
  const themes = Object.values(CAPTURE_THEME);
  if (!requested) return themes;
  const theme = themes.find((candidate) => candidate === requested);
  if (!theme) throw new Error(`Unknown theme "${requested}". Use one of: ${themes.join(', ')}.`);
  return [theme];
}

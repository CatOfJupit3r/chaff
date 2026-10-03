import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

export const themeModesEnumwaii = em(['SYSTEM', 'DARK', 'LIGHT']);

export const THEME_MODES = themeModesEnumwaii.enum;
export type ThemeMode = InferEnumwaii<typeof themeModesEnumwaii>;
export const themeModeSchema = emToZodSchema(themeModesEnumwaii);
export const themeModeValues = themeModesEnumwaii.values;

export const THEME_MODE_LABELS = themeModesEnumwaii.derive(
  [THEME_MODES.SYSTEM, 'System'],
  [THEME_MODES.DARK, 'Dark'],
  [THEME_MODES.LIGHT, 'Light'],
);

export const accentsEnumwaii = em(['DEFAULT', 'VIOLET', 'TEAL', 'ORANGE']);

export const ACCENTS = accentsEnumwaii.enum;
export type Accent = InferEnumwaii<typeof accentsEnumwaii>;
export const accentSchema = emToZodSchema(accentsEnumwaii);
export const accentValues = accentsEnumwaii.values;

export const ACCENT_LABELS = accentsEnumwaii.derive(
  [ACCENTS.DEFAULT, 'Default'],
  [ACCENTS.VIOLET, 'Violet'],
  [ACCENTS.TEAL, 'Teal'],
  [ACCENTS.ORANGE, 'Orange'],
);

export const codeSizesEnumwaii = em(['SMALL', 'DEFAULT', 'LARGE']);

export const CODE_SIZES = codeSizesEnumwaii.enum;
export type CodeSize = InferEnumwaii<typeof codeSizesEnumwaii>;
export const codeSizeSchema = emToZodSchema(codeSizesEnumwaii);
export const codeSizeValues = codeSizesEnumwaii.values;

export const CODE_SIZE_LABELS = codeSizesEnumwaii.derive(
  [CODE_SIZES.SMALL, 'Small'],
  [CODE_SIZES.DEFAULT, 'Default'],
  [CODE_SIZES.LARGE, 'Large'],
);

export const codeFontsEnumwaii = em(['GEIST_MONO', 'JETBRAINS_MONO', 'SYSTEM']);

export const CODE_FONTS = codeFontsEnumwaii.enum;
export type CodeFont = InferEnumwaii<typeof codeFontsEnumwaii>;
export const codeFontSchema = emToZodSchema(codeFontsEnumwaii);
export const codeFontValues = codeFontsEnumwaii.values;

export const CODE_FONT_LABELS = codeFontsEnumwaii.derive(
  [CODE_FONTS.GEIST_MONO, 'Geist Mono'],
  [CODE_FONTS.JETBRAINS_MONO, 'JetBrains Mono'],
  [CODE_FONTS.SYSTEM, 'System'],
);

export const codeLineHeightsEnumwaii = em(['COMPACT', 'DEFAULT', 'RELAXED']);

export const CODE_LINE_HEIGHTS = codeLineHeightsEnumwaii.enum;
export type CodeLineHeight = InferEnumwaii<typeof codeLineHeightsEnumwaii>;
export const codeLineHeightSchema = emToZodSchema(codeLineHeightsEnumwaii);
export const codeLineHeightValues = codeLineHeightsEnumwaii.values;

export const CODE_LINE_HEIGHT_LABELS = codeLineHeightsEnumwaii.derive(
  [CODE_LINE_HEIGHTS.COMPACT, 'Compact'],
  [CODE_LINE_HEIGHTS.DEFAULT, 'Default'],
  [CODE_LINE_HEIGHTS.RELAXED, 'Relaxed'],
);

export const densitiesEnumwaii = em(['COMFORTABLE', 'COMPACT']);

export const DENSITIES = densitiesEnumwaii.enum;
export type Density = InferEnumwaii<typeof densitiesEnumwaii>;
export const densitySchema = emToZodSchema(densitiesEnumwaii);
export const densityValues = densitiesEnumwaii.values;

export const DENSITY_LABELS = densitiesEnumwaii.derive(
  [DENSITIES.COMFORTABLE, 'Comfortable'],
  [DENSITIES.COMPACT, 'Compact'],
);

/** Syntax colors; each theme has a light and a dark variant, and one is picked per mode. */
export const syntaxThemesEnumwaii = em(['CHAFF', 'GITHUB', 'SOLARIZED', 'MONOCHROME']);

export const SYNTAX_THEMES = syntaxThemesEnumwaii.enum;
export type SyntaxTheme = InferEnumwaii<typeof syntaxThemesEnumwaii>;
export const syntaxThemeSchema = emToZodSchema(syntaxThemesEnumwaii);
export const syntaxThemeValues = syntaxThemesEnumwaii.values;

export const SYNTAX_THEME_LABELS = syntaxThemesEnumwaii.derive(
  [SYNTAX_THEMES.CHAFF, 'Chaff'],
  [SYNTAX_THEMES.GITHUB, 'GitHub'],
  [SYNTAX_THEMES.SOLARIZED, 'Solarized'],
  [SYNTAX_THEMES.MONOCHROME, 'Monochrome'],
);

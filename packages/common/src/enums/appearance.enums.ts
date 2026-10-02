import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

export const themeModesEnumwaii = new Enumwaii('ThemeMode', ['SYSTEM', 'DARK', 'LIGHT']);

export const THEME_MODES = themeModesEnumwaii.enum;
export type ThemeMode = InferEnumwaii<typeof themeModesEnumwaii>;
export const themeModeSchema = themeModesEnumwaii.schema;
export const themeModeValues = themeModesEnumwaii.values;

export const THEME_MODE_LABELS = themeModesEnumwaii.derive({
  [THEME_MODES.SYSTEM]: 'System',
  [THEME_MODES.DARK]: 'Dark',
  [THEME_MODES.LIGHT]: 'Light',
});

export const accentsEnumwaii = new Enumwaii('Accent', ['DEFAULT', 'VIOLET', 'TEAL', 'ORANGE']);

export const ACCENTS = accentsEnumwaii.enum;
export type Accent = InferEnumwaii<typeof accentsEnumwaii>;
export const accentSchema = accentsEnumwaii.schema;
export const accentValues = accentsEnumwaii.values;

export const ACCENT_LABELS = accentsEnumwaii.derive({
  [ACCENTS.DEFAULT]: 'Default',
  [ACCENTS.VIOLET]: 'Violet',
  [ACCENTS.TEAL]: 'Teal',
  [ACCENTS.ORANGE]: 'Orange',
});

export const codeSizesEnumwaii = new Enumwaii('CodeSize', ['SMALL', 'DEFAULT', 'LARGE']);

export const CODE_SIZES = codeSizesEnumwaii.enum;
export type CodeSize = InferEnumwaii<typeof codeSizesEnumwaii>;
export const codeSizeSchema = codeSizesEnumwaii.schema;
export const codeSizeValues = codeSizesEnumwaii.values;

export const CODE_SIZE_LABELS = codeSizesEnumwaii.derive({
  [CODE_SIZES.SMALL]: 'Small',
  [CODE_SIZES.DEFAULT]: 'Default',
  [CODE_SIZES.LARGE]: 'Large',
});

export const codeFontsEnumwaii = new Enumwaii('CodeFont', ['GEIST_MONO', 'JETBRAINS_MONO', 'SYSTEM']);

export const CODE_FONTS = codeFontsEnumwaii.enum;
export type CodeFont = InferEnumwaii<typeof codeFontsEnumwaii>;
export const codeFontSchema = codeFontsEnumwaii.schema;
export const codeFontValues = codeFontsEnumwaii.values;

export const CODE_FONT_LABELS = codeFontsEnumwaii.derive({
  [CODE_FONTS.GEIST_MONO]: 'Geist Mono',
  [CODE_FONTS.JETBRAINS_MONO]: 'JetBrains Mono',
  [CODE_FONTS.SYSTEM]: 'System',
});

export const codeLineHeightsEnumwaii = new Enumwaii('CodeLineHeight', ['COMPACT', 'DEFAULT', 'RELAXED']);

export const CODE_LINE_HEIGHTS = codeLineHeightsEnumwaii.enum;
export type CodeLineHeight = InferEnumwaii<typeof codeLineHeightsEnumwaii>;
export const codeLineHeightSchema = codeLineHeightsEnumwaii.schema;
export const codeLineHeightValues = codeLineHeightsEnumwaii.values;

export const CODE_LINE_HEIGHT_LABELS = codeLineHeightsEnumwaii.derive({
  [CODE_LINE_HEIGHTS.COMPACT]: 'Compact',
  [CODE_LINE_HEIGHTS.DEFAULT]: 'Default',
  [CODE_LINE_HEIGHTS.RELAXED]: 'Relaxed',
});

export const densitiesEnumwaii = new Enumwaii('Density', ['COMFORTABLE', 'COMPACT']);

export const DENSITIES = densitiesEnumwaii.enum;
export type Density = InferEnumwaii<typeof densitiesEnumwaii>;
export const densitySchema = densitiesEnumwaii.schema;
export const densityValues = densitiesEnumwaii.values;

export const DENSITY_LABELS = densitiesEnumwaii.derive({
  [DENSITIES.COMFORTABLE]: 'Comfortable',
  [DENSITIES.COMPACT]: 'Compact',
});

/** Syntax colors; each theme has a light and a dark variant, and one is picked per mode. */
export const syntaxThemesEnumwaii = new Enumwaii('SyntaxTheme', ['CHAFF', 'GITHUB', 'SOLARIZED', 'MONOCHROME']);

export const SYNTAX_THEMES = syntaxThemesEnumwaii.enum;
export type SyntaxTheme = InferEnumwaii<typeof syntaxThemesEnumwaii>;
export const syntaxThemeSchema = syntaxThemesEnumwaii.schema;
export const syntaxThemeValues = syntaxThemesEnumwaii.values;

export const SYNTAX_THEME_LABELS = syntaxThemesEnumwaii.derive({
  [SYNTAX_THEMES.CHAFF]: 'Chaff',
  [SYNTAX_THEMES.GITHUB]: 'GitHub',
  [SYNTAX_THEMES.SOLARIZED]: 'Solarized',
  [SYNTAX_THEMES.MONOCHROME]: 'Monochrome',
});

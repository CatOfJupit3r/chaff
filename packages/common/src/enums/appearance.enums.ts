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

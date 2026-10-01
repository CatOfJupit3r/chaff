import {
  ACCENT_LABELS,
  ACCENTS,
  accentsEnumwaii,
  accentValues,
  CODE_SIZE_LABELS,
  codeSizeValues,
  THEME_MODE_LABELS,
  themeModeValues,
} from '@chaff/common/enums/appearance.enums';

export const THEME_MODE_OPTIONS = themeModeValues.map((value) => ({ value, label: THEME_MODE_LABELS(value) }));

export const CODE_SIZE_OPTIONS = codeSizeValues.map((value) => ({ value, label: CODE_SIZE_LABELS(value) }));

const ACCENT_SWATCH_CLASSES = accentsEnumwaii.derive({
  [ACCENTS.DEFAULT]: 'bg-accent-default',
  [ACCENTS.VIOLET]: 'bg-accent-violet',
  [ACCENTS.TEAL]: 'bg-accent-teal',
  [ACCENTS.ORANGE]: 'bg-accent-orange',
});

export const ACCENT_OPTIONS = accentValues.map((value) => ({
  value,
  label: ACCENT_LABELS(value),
  swatchClassName: ACCENT_SWATCH_CLASSES(value),
}));

/** The tokens the Appearance dialog shows, with the Tailwind class each one is used through. */
export const TOKEN_SAMPLES = [
  { swatchClassName: 'bg-canvas', name: 'bg-canvas' },
  { swatchClassName: 'bg-surface', name: 'bg-surface' },
  { swatchClassName: 'bg-raised', name: 'bg-raised' },
  { swatchClassName: 'bg-line', name: 'border-line' },
  { swatchClassName: 'bg-fg', name: 'text-fg' },
  { swatchClassName: 'bg-muted', name: 'text-muted' },
  { swatchClassName: 'bg-accent', name: 'text-accent' },
  { swatchClassName: 'bg-good', name: 'text-good' },
  { swatchClassName: 'bg-warn', name: 'text-warn' },
  { swatchClassName: 'bg-bad', name: 'text-bad' },
  { swatchClassName: 'bg-add-bg', name: 'bg-add-bg' },
  { swatchClassName: 'bg-del-bg', name: 'bg-del-bg' },
];

import { registerCustomCSSVariableTheme } from '@pierre/diffs';

/** Syntax theme for every diff; its colors resolve to the app's theme tokens, so light, dark and custom themes apply. */
export const DIFF_THEME_NAME = 'chaff';

registerCustomCSSVariableTheme(DIFF_THEME_NAME, {
  foreground: 'var(--fg-code)',
  background: 'var(--canvas)',
  'token-keyword': 'var(--tok-kw)',
  'token-string': 'var(--tok-str)',
  'token-string-expression': 'var(--tok-str)',
  'token-constant': 'var(--tok-num)',
  'token-comment': 'var(--tok-com)',
  'token-function': 'var(--tok-fn)',
  'token-parameter': 'var(--fg-code)',
  'token-punctuation': 'var(--fg-code)',
  'token-link': 'var(--accent)',
});

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

/**
 * Unified diffs show the old and the new line number side by side, like GitLab. The renderer is patched
 * (`patches/@pierre__diffs`) to put both numbers on each gutter row.
 */
export const UNIFIED_LINE_NUMBERS_CSS = `
[data-gutter] [data-column-number][data-old-line] [data-line-number-content] { display: none; }
[data-gutter] [data-column-number][data-old-line]::before,
[data-gutter] [data-column-number][data-old-line]::after {
  display: inline-block;
  min-width: var(--diffs-min-number-column-width, 3ch);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
[data-gutter] [data-column-number][data-old-line]::before { content: attr(data-old-line); margin-right: 1.5ch; }
[data-gutter] [data-column-number][data-old-line]::after { content: attr(data-new-line); }
`;

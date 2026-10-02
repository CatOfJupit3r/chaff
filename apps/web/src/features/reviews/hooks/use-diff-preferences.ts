import { useMemo } from 'react';

import { DIFF_CONTEXT_LINES, DIFF_CONTEXTS, INLINE_DIFFS, inlineDiffsEnumwaii } from '@chaff/common/enums/diff.enums';

import { useSettings } from '@~/features/settings/hooks/use-settings';

/** How the diff viewer marks changes inside a changed line, for each setting. */
const LINE_DIFF_TYPES = inlineDiffsEnumwaii.derive({
  [INLINE_DIFFS.WORD]: 'word-alt' as const,
  [INLINE_DIFFS.CHARACTER]: 'char' as const,
  [INLINE_DIFFS.NONE]: 'none' as const,
});

/** The diff settings as the diff viewer and the patch query take them. */
export function useDiffPreferences() {
  const { diffContext, isWhitespaceIgnored, inlineDiff } = useSettings();
  const contextLines = DIFF_CONTEXT_LINES(diffContext);
  const viewerOptions = useMemo(
    () => ({
      lineDiffType: LINE_DIFF_TYPES(inlineDiff),
      expandUnchanged: diffContext === DIFF_CONTEXTS.WHOLE_FILE,
      parseDiffOptions: { context: contextLines, ignoreWhitespace: isWhitespaceIgnored },
    }),
    [inlineDiff, diffContext, contextLines, isWhitespaceIgnored],
  );
  return { contextLines, isWhitespaceIgnored, viewerOptions };
}

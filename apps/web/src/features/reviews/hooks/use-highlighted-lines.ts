import { getFiletypeFromFileName, getSharedHighlighter } from '@pierre/diffs';
import { useQuery } from '@tanstack/react-query';

import { DIFF_THEME_NAME } from '../diff-theme';

async function highlight(path: string, code: string) {
  const lang = getFiletypeFromFileName(path);
  const highlighter = await getSharedHighlighter({
    themes: [DIFF_THEME_NAME],
    langs: [lang],
    preferredHighlighter: 'shiki-js',
  });
  return highlighter.codeToTokensBase(code, { lang, theme: DIFF_THEME_NAME });
}

/** Syntax tokens for a few lines of a file, colored like the diffs; undefined until the grammar loads. */
export function useHighlightedLines(path: string, lines: readonly string[]) {
  const code = lines.join('\n');
  return useQuery({
    queryKey: ['highlighted-lines', path, code],
    queryFn: async () => highlight(path, code),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  }).data;
}

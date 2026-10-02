import { MultiFileDiff } from '@pierre/diffs/react';
import { useMemo } from 'react';

import { useIsDarkMode } from '@~/features/appearance/hooks/use-is-dark-mode';

import { DIFF_THEME_NAME } from '../diff-theme';
import type { DiffLayout } from '../reviews.enums';

interface iContentsDiffProps {
  path: string;
  oldContents: string;
  newContents: string;
  layout: DiffLayout;
}

/** Two versions of a file compared, with unchanged lines folded away and expandable. */
export function ContentsDiff({ path, oldContents, newContents, layout }: iContentsDiffProps) {
  const isDark = useIsDarkMode();
  const options = useMemo(
    () => ({
      theme: DIFF_THEME_NAME,
      themeType: isDark ? ('dark' as const) : ('light' as const),
      diffStyle: layout,
      overflow: 'scroll' as const,
      disableFileHeader: true,
      preferredHighlighter: 'shiki-js' as const,
      diffIndicators: 'classic' as const,
    }),
    [isDark, layout],
  );

  return (
    <MultiFileDiff
      oldFile={{ name: path, contents: oldContents }}
      newFile={{ name: path, contents: newContents }}
      options={options}
      disableWorkerPool
    />
  );
}

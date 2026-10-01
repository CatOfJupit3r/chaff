import { PatchDiff } from '@pierre/diffs/react';

import { useIsDarkMode } from '@~/features/appearance/hooks/use-is-dark-mode';

import { DIFF_THEME_NAME } from '../diff-theme';
import { useLoadDiffFiles } from '../hooks/use-load-diff-files';
import type { DiffLayout } from '../reviews.enums';
import type { iSnapshotFile } from '../reviews.types';

interface iPatchViewProps {
  snapshotId: string;
  file: iSnapshotFile;
  patch: string;
  layout: DiffLayout;
  isWrapped: boolean;
}

/** A file's patch with syntax highlighting; hidden context can be expanded from the snapshot. */
export function PatchView({ snapshotId, file, patch, layout, isWrapped }: iPatchViewProps) {
  const isDark = useIsDarkMode();
  const loadDiffFiles = useLoadDiffFiles(snapshotId, file);

  return (
    <PatchDiff
      patch={patch}
      disableWorkerPool
      options={{
        theme: DIFF_THEME_NAME,
        themeType: isDark ? 'dark' : 'light',
        diffStyle: layout,
        overflow: isWrapped ? 'wrap' : 'scroll',
        disableFileHeader: true,
        preferredHighlighter: 'shiki-js',
        loadDiffFiles,
      }}
    />
  );
}

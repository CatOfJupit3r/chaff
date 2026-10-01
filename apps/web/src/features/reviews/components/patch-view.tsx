import type { SelectedLineRange } from '@pierre/diffs';
import { PatchDiff } from '@pierre/diffs/react';
import { useMemo } from 'react';

import { useIsDarkMode } from '@~/features/appearance/hooks/use-is-dark-mode';

import { buildNoteAnnotations, draftFromSelection } from '../diff-annotations.utils';
import type { iDiffNote } from '../diff-annotations.utils';
import { useOptionalDiffReview } from '../diff-review.context';
import { DIFF_THEME_NAME } from '../diff-theme';
import { useLoadDiffFiles } from '../hooks/use-load-diff-files';
import { buildDecisionGutterCss } from '../review-coverage.utils';
import type { DiffLayout } from '../reviews.enums';
import type { iSnapshotFile } from '../reviews.types';
import { DiffFindingNote } from './diff-finding-note';
import { DiffNoteComposer } from './diff-note-composer';

interface iPatchViewProps {
  snapshotId: string;
  file: iSnapshotFile;
  patch: string;
  layout: DiffLayout;
  isWrapped: boolean;
}

/**
 * A file's patch with syntax highlighting; hidden context can be expanded from the snapshot. In the Full
 * diff, lines show the decision on their unit, findings sit under the lines they point at, and the + beside
 * a line, or a picked range, opens a note.
 */
export function PatchView({ snapshotId, file, patch, layout, isWrapped }: iPatchViewProps) {
  const isDark = useIsDarkMode();
  const loadDiffFiles = useLoadDiffFiles(snapshotId, file);
  const review = useOptionalDiffReview();
  const units = review?.unitsByFile.get(file.id);
  const placements = review?.placementsByFile.get(file.id);
  const draft = review?.draft;
  const startDraft = review?.startDraft;
  const gutterCss = useMemo(() => (units ? buildDecisionGutterCss(units) : undefined), [units]);
  const annotations = useMemo(
    () => buildNoteAnnotations(file.id, placements ?? [], draft),
    [file.id, placements, draft],
  );

  const options = useMemo(
    () => ({
      theme: DIFF_THEME_NAME,
      themeType: isDark ? ('dark' as const) : ('light' as const),
      diffStyle: layout,
      overflow: isWrapped ? ('wrap' as const) : ('scroll' as const),
      disableFileHeader: true,
      preferredHighlighter: 'shiki-js' as const,
      loadDiffFiles,
      diffIndicators: 'classic' as const,
      unsafeCSS: gutterCss,
      enableLineSelection: startDraft !== undefined,
      enableGutterUtility: startDraft !== undefined,
      onGutterUtilityClick: (range: SelectedLineRange) => startDraft?.(draftFromSelection(file.id, range)),
    }),
    [isDark, layout, isWrapped, loadDiffFiles, gutterCss, startDraft, file.id],
  );

  return (
    <PatchDiff<iDiffNote>
      patch={patch}
      disableWorkerPool
      lineAnnotations={annotations}
      renderAnnotation={({ metadata }) =>
        metadata.finding ? <DiffFindingNote finding={metadata.finding} /> : <DiffNoteComposer />
      }
      options={options}
    />
  );
}

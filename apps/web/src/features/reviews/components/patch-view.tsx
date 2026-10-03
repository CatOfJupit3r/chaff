import type { SelectedLineRange } from '@pierre/diffs';
import { PatchDiff } from '@pierre/diffs/react';
import { useMemo } from 'react';

import type { DiffLayout } from '@chaff/common/enums/diff.enums';

import { useIsDarkMode } from '@~/features/appearance/hooks/use-is-dark-mode';
import { DiscussionThread } from '@~/features/code-hosts/components/discussion-thread';

import { buildNoteAnnotations, draftFromSelection } from '../diff-annotations.utils';
import type { iDiffNote } from '../diff-annotations.utils';
import { useOptionalDiffReview } from '../diff-review.context';
import { DIFF_THEME_NAME, UNIFIED_LINE_NUMBERS_CSS } from '../diff-theme';
import { useDiffPreferences } from '../hooks/use-diff-preferences';
import { useLoadDiffFiles } from '../hooks/use-load-diff-files';
import { buildDecisionGutterCss } from '../review-coverage.utils';
import type { iSnapshotFile } from '../reviews.types';
import { DiffFindingNote } from './diff-finding-note';
import { DiffNoteComposer } from './diff-note-composer';

interface iPatchViewProps {
  snapshotId: string;
  file: iSnapshotFile;
  patch: string;
  layout: DiffLayout;
  isWrapped: boolean;
  /** Shows every unchanged line of the file, whatever the diff settings say. */
  isExpanded?: boolean;
}

/**
 * A file's patch with syntax highlighting; hidden context can be expanded from the snapshot. In the Full
 * diff, lines show the decision on their unit, findings and merge request threads sit under the lines they
 * point at, and the + beside a line, or a picked range, opens a note.
 */
export function PatchView({ snapshotId, file, patch, layout, isWrapped, isExpanded = false }: iPatchViewProps) {
  const isDark = useIsDarkMode();
  const { viewerOptions } = useDiffPreferences();
  const loadDiffFiles = useLoadDiffFiles(snapshotId, file);
  const review = useOptionalDiffReview();
  const units = review?.unitsByFile.get(file.id);
  const placements = review?.placementsByFile.get(file.id);
  const discussions = review?.discussionsByFile.get(file.id);
  const draft = review?.draft;
  const startDraft = review?.startDraft;
  const gutterCss = useMemo(() => (units ? buildDecisionGutterCss(units) : undefined), [units]);
  const annotations = useMemo(
    () => buildNoteAnnotations(file.id, placements ?? [], draft, discussions),
    [file.id, placements, draft, discussions],
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
      lineDiffType: viewerOptions.lineDiffType,
      expandUnchanged: isExpanded || viewerOptions.expandUnchanged,
      unsafeCSS: [UNIFIED_LINE_NUMBERS_CSS, gutterCss].filter(Boolean).join('\n'),
      enableLineSelection: startDraft !== undefined,
      enableGutterUtility: startDraft !== undefined,
      onGutterUtilityClick: (range: SelectedLineRange) => startDraft?.(draftFromSelection(file.id, range)),
    }),
    [isDark, layout, isWrapped, isExpanded, loadDiffFiles, viewerOptions, gutterCss, startDraft, file.id],
  );

  return (
    <PatchDiff<iDiffNote>
      patch={patch}
      lineAnnotations={annotations}
      renderAnnotation={({ metadata }) => {
        if (metadata.finding) return <DiffFindingNote finding={metadata.finding} />;
        if (metadata.discussion) {
          return <DiscussionThread discussion={metadata.discussion} className="mx-4 my-2 max-w-[640px]" />;
        }
        return <DiffNoteComposer />;
      }}
      options={options}
    />
  );
}

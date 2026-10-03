import { useRef, useState } from 'react';

import type { DiffLayout } from '@chaff/common/enums/diff.enums';
import { FILE_KINDS } from '@chaff/common/enums/review.enums';

import { DownIcon, ExternalIcon } from '@~/components/icons/icons';

import { useIsNearViewport } from '../hooks/use-is-near-viewport';
import { FILE_SECTION_ATTRIBUTE } from '../hooks/use-scroll-spy';
import type { iSnapshotFile } from '../reviews.types';
import { DiffStat } from './diff-stat';
import { FileDiffBody } from './file-diff-body';
import { MarkFileButton } from './mark-file-button';
import { DiffSkeleton } from './skeleton-components';

/** Height reserved per changed line before a section loads, so the scrollbar stays put. */
const ESTIMATED_LINE_HEIGHT = 20;
const MAX_ESTIMATED_LINES = 400;

interface iDiffFileSectionProps {
  snapshotId: string;
  file: iSnapshotFile;
  scrollRoot: HTMLElement | null;
  layout: DiffLayout;
  isWrapped: boolean;
  onOpenInEditor: (path: string) => void;
}

/** One file in the All files view; its diff loads when it scrolls near the visible area. */
export function DiffFileSection({
  snapshotId,
  file,
  scrollRoot,
  layout,
  isWrapped,
  onOpenInEditor,
}: iDiffFileSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const isNear = useIsNearViewport(ref, scrollRoot);
  const [isOpen, setIsOpen] = useState(true);
  const changedLines = file.additions + file.deletions;

  return (
    <section ref={ref} {...{ [FILE_SECTION_ATTRIBUTE]: file.path }} className="border-b border-line">
      <div className="sticky top-0 z-3 flex flex-wrap items-center gap-2.5 border-b border-line bg-surface px-4 py-2 text-[12.5px] text-muted">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${file.path}`}
          onClick={() => setIsOpen(!isOpen)}
          className="group grid size-[22px] place-items-center rounded-[5px] text-faint hover:bg-hover hover:text-fg"
        >
          <DownIcon className="size-[13px] group-aria-[expanded=false]:-rotate-90" />
        </button>
        <span className="font-mono text-fg">{file.path}</span>
        <DiffStat additions={file.additions} deletions={file.deletions} />
        {file.kind === FILE_KINDS.GENERATED ? (
          <span className="rounded-[4px] border border-line px-1.5 text-[11px] text-faint">generated</span>
        ) : null}
        <span className="ml-auto" />
        <MarkFileButton fileId={file.id} />
        <button
          type="button"
          aria-label={`Open ${file.path} in editor`}
          title="Open in editor"
          onClick={() => onOpenInEditor(file.path)}
          className="grid size-[26px] place-items-center rounded-sm text-muted hover:bg-hover hover:text-fg"
        >
          <ExternalIcon className="size-[13px]" />
        </button>
      </div>
      {isOpen ? (
        <div style={{ minHeight: isNear ? 0 : Math.min(changedLines, MAX_ESTIMATED_LINES) * ESTIMATED_LINE_HEIGHT }}>
          {isNear ? (
            <FileDiffBody snapshotId={snapshotId} file={file} layout={layout} isWrapped={isWrapped} />
          ) : (
            <DiffSkeleton lineCount={changedLines} />
          )}
        </div>
      ) : null}
    </section>
  );
}

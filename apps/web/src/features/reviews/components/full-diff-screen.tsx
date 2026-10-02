import { Link } from '@tanstack/react-router';

import { ExternalIcon, FocusIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';

import { DiffReviewContext } from '../diff-review.context';
import { useDiffReviewState } from '../hooks/use-diff-review-state';
import { useFullDiff } from '../hooks/use-full-diff';
import { useResizablePanel } from '../hooks/use-resizable-panel';
import { AllFilesView } from './all-files-view';
import { DecisionLegend } from './decision-legend';
import { DiffStat } from './diff-stat';
import { DiffToolbar } from './diff-toolbar';
import { FileDiffBody } from './file-diff-body';
import { FilePathLabel } from './file-path-label';
import { FileStatusBadge } from './file-status-badge';
import { FileTreePanel } from './file-tree-panel';
import { MarkFileButton } from './mark-file-button';
import { ReviewTopBar } from './review-top-bar';

/** Every change in a snapshot: a file tree beside one file's diff or all of them. */
export function FullDiffScreen({ snapshotId }: { snapshotId: string }) {
  const {
    snapshot,
    repositoryName,
    files,
    currentFile,
    view,
    isAllFiles,
    scrollRoot,
    setScrollRoot,
    selectFile,
    openInEditor,
  } = useFullDiff(snapshotId);
  const panel = useResizablePanel();
  const review = useDiffReviewState(snapshot);
  const diffProps = { snapshotId, layout: view.layout, isWrapped: view.wrap };

  return (
    <DiffReviewContext value={review}>
      <ReviewTopBar snapshot={snapshot} repositoryName={repositoryName} />
      <div
        style={{ gridTemplateColumns: `${panel.isOpen ? panel.width : 0}px minmax(0, 1fr)` }}
        className={cn(
          'relative grid min-h-0 flex-1',
          panel.isResizing ? 'cursor-col-resize select-none' : 'transition-[grid-template-columns] duration-200',
        )}
      >
        <aside
          aria-label="Changed files"
          className="min-w-0 scrollbar-gutter-stable overflow-x-hidden overflow-y-auto border-r border-line"
        >
          <div style={{ width: panel.width }}>
            <FileTreePanel
              snapshotId={snapshotId}
              files={snapshot.files}
              currentPath={currentFile?.path}
              onSelect={selectFile}
              onOpenInEditor={openInEditor}
            />
          </div>
        </aside>
        {panel.isOpen ? (
          <div
            {...panel.separatorProps}
            style={{ left: panel.width - 4 }}
            className="group absolute inset-y-0 z-6 w-2 cursor-col-resize focus-visible:outline-none"
          >
            <span className="absolute inset-y-0 left-[3px] w-0.5 group-hover:bg-accent group-focus-visible:bg-accent group-active:bg-accent" />
          </div>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-col">
          <DiffToolbar
            isTreeOpen={panel.isOpen}
            onToggleTree={panel.toggle}
            mode={view.mode}
            onModeChange={(mode) => view.update({ mode })}
            layout={view.layout}
            onLayoutChange={(layout) => view.update({ layout })}
            isWrapped={view.wrap}
            onToggleWrap={() => view.update({ wrap: !view.wrap })}
            end={
              <>
                <DecisionLegend />
                <Link
                  to="/reviews/$snapshotId"
                  params={{ snapshotId }}
                  className="inline-flex h-[26px] items-center gap-2 rounded-sm border border-line-strong bg-surface px-[9px] text-[12px] text-fg hover:bg-hover [&_svg]:size-3.5"
                >
                  <FocusIcon />
                  Focus
                </Link>
              </>
            }
          >
            {isAllFiles || !currentFile ? (
              <>
                <span className="font-mono text-[13px]">{pluralize(files.length, 'file')}</span>
                <DiffStat additions={snapshot.additions} deletions={snapshot.deletions} />
              </>
            ) : (
              <>
                <FileStatusBadge file={currentFile} />
                <FilePathLabel file={currentFile} className="truncate text-[13px]" />
                <DiffStat additions={currentFile.additions} deletions={currentFile.deletions} />
                <Button variant="ghost" size="sm" onClick={() => openInEditor(currentFile.path)}>
                  <ExternalIcon />
                  Open in editor
                </Button>
                <MarkFileButton fileId={currentFile.id} />
              </>
            )}
          </DiffToolbar>
          <div ref={setScrollRoot} className="relative min-h-0 flex-1 scrollbar-gutter-stable overflow-auto bg-canvas">
            {isAllFiles ? (
              <AllFilesView
                files={files}
                initialPath={currentFile?.path}
                scrollRoot={scrollRoot}
                onOpenInEditor={openInEditor}
                {...diffProps}
              />
            ) : null}
            {!isAllFiles && currentFile ? (
              <FileDiffBody key={currentFile.id} file={currentFile} {...diffProps} />
            ) : null}
            {files.length === 0 ? (
              <p className="m-0 p-8 text-center text-muted">This snapshot has no changes.</p>
            ) : null}
          </div>
        </div>
      </div>
    </DiffReviewContext>
  );
}

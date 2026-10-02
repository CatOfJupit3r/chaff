import { useDeferredValue, useState } from 'react';

import { SearchIcon } from '@~/components/icons/icons';
import { SectionLabel } from '@~/components/ui/section-label';
import { SegmentedControl } from '@~/components/ui/segmented-control';

import { useDiffReview } from '../diff-review.context';
import { MIN_DIFF_SEARCH_LENGTH, useDiffSearch } from '../hooks/use-diff-search';
import { useFileTree } from '../hooks/use-file-tree';
import { countCoveredLines } from '../review-coverage.utils';
import { FILE_TREE_VIEWS, FILE_TREE_VIEW_LABELS, fileTreeViewValues } from '../reviews.enums';
import type { FileTreeView } from '../reviews.enums';
import type { iSnapshotFile } from '../reviews.types';
import { DiffSearchResults } from './diff-search-results';
import { FileTreeFolder } from './file-tree-folder';
import { FileTreeRow } from './file-tree-row';

const VIEW_OPTIONS = fileTreeViewValues.map((value) => ({ value, label: FILE_TREE_VIEW_LABELS(value) }));

interface iFileTreePanelProps {
  snapshotId: string;
  files: readonly iSnapshotFile[];
  currentPath?: string;
  onSelect: (path: string) => void;
  onOpenInEditor: (path: string) => void;
}

/** The snapshot's changed files as a folder tree or a flat list, with a filter over names and changed code. */
export function FileTreePanel({ snapshotId, files, currentPath, onSelect, onOpenInEditor }: iFileTreePanelProps) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<FileTreeView>(FILE_TREE_VIEWS.tree);
  const searchedQuery = useDeferredValue(query.trim());
  const { data: search } = useDiffSearch(snapshotId, searchedQuery);
  const { matches, tree } = useFileTree(files, query);
  const hasCodeMatches = searchedQuery.length >= MIN_DIFF_SEARCH_LENGTH && (search?.files.length ?? 0) > 0;
  const rowProps = { currentPath, onSelect, onOpenInEditor };
  const coverage = countCoveredLines([...useDiffReview().unitsByFile.values()].flat());

  return (
    <div className="flex flex-col gap-0.5 px-2.5 py-3.5">
      <div className="flex items-center justify-between gap-2 pr-1 pb-2 pl-2">
        <SectionLabel>Files · {files.length}</SectionLabel>
        <SegmentedControl
          label="File list layout"
          options={VIEW_OPTIONS}
          value={view}
          onChange={setView}
          className="[&_button]:h-[22px] [&_button]:px-2 [&_button]:text-[11.5px]"
        />
      </div>
      <label className="mx-1 mb-2 flex items-center gap-2 rounded-sm border border-line bg-surface px-2 py-1.5 text-faint">
        <SearchIcon className="size-[13px]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter files and code"
          aria-label="Filter files and changed code"
          className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-faint"
        />
      </label>
      {matches.length === 0 && !hasCodeMatches ? (
        <p className="m-0 p-2 text-[12.5px] text-muted">No changed file or line matches.</p>
      ) : null}
      {matches.length > 0 && view === FILE_TREE_VIEWS.tree ? (
        <FileTreeFolder folder={tree} isForcedOpen={query.trim() !== ''} {...rowProps} />
      ) : null}
      {matches.length > 0 && view === FILE_TREE_VIEWS.list
        ? matches
            .toSorted((left, right) => left.path.localeCompare(right.path))
            .map((file) => (
              <FileTreeRow key={file.id} file={file} hasFolder isCurrent={file.path === currentPath} {...rowProps} />
            ))
        : null}
      {hasCodeMatches && search ? (
        <DiffSearchResults search={search} query={searchedQuery} onSelect={onSelect} />
      ) : null}
      <p className="m-0 px-2 pt-4 text-[12.5px] leading-normal text-faint">
        {coverage.covered} of {coverage.total} changed lines are covered by a decision. Opening or scrolling past a file
        never counts.
      </p>
    </div>
  );
}

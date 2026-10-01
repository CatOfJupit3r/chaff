import { useState } from 'react';

import { SearchIcon } from '@~/components/icons/icons';
import { SectionLabel } from '@~/components/ui/section-label';
import { SegmentedControl } from '@~/components/ui/segmented-control';

import { buildFileTree, filterFiles } from '../file-tree.utils';
import { FILE_TREE_VIEWS, FILE_TREE_VIEW_LABELS, fileTreeViewValues } from '../reviews.enums';
import type { FileTreeView } from '../reviews.enums';
import type { iSnapshotFile } from '../reviews.types';
import { FileTreeFolder } from './file-tree-folder';
import { FileTreeRow } from './file-tree-row';

const VIEW_OPTIONS = fileTreeViewValues.map((value) => ({ value, label: FILE_TREE_VIEW_LABELS(value) }));

interface iFileTreePanelProps {
  files: readonly iSnapshotFile[];
  currentPath?: string;
  onSelect: (path: string) => void;
  onOpenInEditor: (path: string) => void;
}

/** The snapshot's changed files as a folder tree or a flat list, with a filter. */
export function FileTreePanel({ files, currentPath, onSelect, onOpenInEditor }: iFileTreePanelProps) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<FileTreeView>(FILE_TREE_VIEWS.tree);
  const matches = filterFiles(files, query);
  const rowProps = { currentPath, onSelect, onOpenInEditor };

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
          placeholder="Filter files"
          aria-label="Filter files"
          className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-faint"
        />
      </label>
      {matches.length === 0 ? <p className="m-0 p-2 text-[12.5px] text-muted">No changed file matches.</p> : null}
      {matches.length > 0 && view === FILE_TREE_VIEWS.tree ? (
        <FileTreeFolder folder={buildFileTree(matches)} isForcedOpen={query.trim() !== ''} {...rowProps} />
      ) : null}
      {matches.length > 0 && view === FILE_TREE_VIEWS.list
        ? matches
            .toSorted((left, right) => left.path.localeCompare(right.path))
            .map((file) => (
              <FileTreeRow key={file.id} file={file} hasFolder isCurrent={file.path === currentPath} {...rowProps} />
            ))
        : null}
    </div>
  );
}

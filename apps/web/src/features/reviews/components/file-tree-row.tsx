import { useEffect, useRef } from 'react';

import { ExternalIcon } from '@~/components/icons/icons';

import { splitPath } from '../file-tree.utils';
import type { iSnapshotFile } from '../reviews.types';
import { DiffStat } from './diff-stat';

interface iFileTreeRowProps {
  file: iSnapshotFile;
  /** Show the folder before the name, for the flat list. */
  hasFolder?: boolean;
  isCurrent: boolean;
  onSelect: (path: string) => void;
  onOpenInEditor: (path: string) => void;
}

/** One changed file; on hover the line counts give way to an editor link without moving anything. */
export function FileTreeRow({ file, hasFolder = false, isCurrent, onSelect, onOpenInEditor }: iFileTreeRowProps) {
  const { folder, name } = splitPath(file.path);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isCurrent) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [isCurrent]);

  return (
    <div className="group relative">
      <button
        ref={ref}
        type="button"
        title={file.oldPath ? `${file.oldPath} \u2192 ${file.path}` : file.path}
        aria-current={isCurrent ? 'true' : undefined}
        onClick={() => onSelect(file.path)}
        className="grid h-[30px] w-full grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2 rounded-sm px-2 text-left text-[12.5px] text-muted hover:bg-hover hover:text-fg aria-current:bg-raised aria-current:text-fg"
      >
        <span aria-hidden="true" className="size-2.5 rounded-full border-[1.5px] border-faint" />
        <span className="truncate font-mono text-[12px]">
          {hasFolder ? <span className="text-faint">{folder}</span> : null}
          {name}
        </span>
        <DiffStat
          additions={file.additions}
          deletions={file.deletions}
          className="min-w-5 text-right group-focus-within:invisible group-hover:invisible"
        />
      </button>
      <button
        type="button"
        aria-label={`Open ${file.path} in editor`}
        title="Open in editor"
        onClick={() => onOpenInEditor(file.path)}
        className="invisible absolute top-[5px] right-2 grid size-5 place-items-center rounded-sm text-muted group-focus-within:visible group-hover:visible hover:bg-hover hover:text-fg"
      >
        <ExternalIcon className="size-3" />
      </button>
    </div>
  );
}

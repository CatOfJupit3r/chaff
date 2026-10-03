import { useState } from 'react';

import { DownIcon, FolderIcon } from '@~/components/icons/icons';
import { cn } from '@~/lib/utils';

import type { iFileTreeFolder } from '../reviews.types';
import { FileTreeRow } from './file-tree-row';

interface iFileTreeFolderProps {
  folder: iFileTreeFolder;
  currentPath?: string;
  /** Folders stay open while the list is filtered. */
  isForcedOpen: boolean;
  onSelect: (path: string) => void;
  onOpenInEditor: (path: string) => void;
}

/** A folder's subfolders and files; the root folder renders its contents without a heading. */
export function FileTreeFolder({ folder, currentPath, isForcedOpen, onSelect, onOpenInEditor }: iFileTreeFolderProps) {
  const [isOpen, setIsOpen] = useState(true);
  const isRoot = folder.path === '';
  const isExpanded = isRoot || isForcedOpen || isOpen;

  const contents = (
    <>
      {folder.folders.map((child) => (
        <FileTreeFolder
          key={child.path}
          folder={child}
          currentPath={currentPath}
          isForcedOpen={isForcedOpen}
          onSelect={onSelect}
          onOpenInEditor={onOpenInEditor}
        />
      ))}
      {folder.files.map((file) => (
        <FileTreeRow
          key={file.id}
          file={file}
          isCurrent={file.path === currentPath}
          onSelect={onSelect}
          onOpenInEditor={onOpenInEditor}
        />
      ))}
    </>
  );

  if (isRoot) return contents;

  return (
    <>
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsOpen(!isOpen)}
        className="group flex h-[30px] w-full items-center gap-1.5 rounded-sm px-2 text-left font-mono text-[12px] text-muted hover:bg-hover hover:text-fg"
      >
        <DownIcon className="size-[13px] text-faint transition-transform group-aria-[expanded=false]:-rotate-90" />
        <FolderIcon className="size-3.5 text-faint" />
        <span className="truncate">{folder.name}</span>
        <span className="ml-auto text-[11px] text-faint">{folder.fileCount}</span>
      </button>
      <div className={cn('ml-[13px] flex-col gap-px border-l border-line pl-1', isExpanded ? 'flex' : 'hidden')}>
        {contents}
      </div>
    </>
  );
}

import { useEffect, useRef } from 'react';

import { FILE_STATUSES } from '@chaff/common/enums/review.enums';

import { ExternalIcon } from '@~/components/icons/icons';
import { cn } from '@~/lib/utils';

import { useDiffReview } from '../diff-review.context';
import { describeFileStatus } from '../file-status.utils';
import { splitPath } from '../file-tree.utils';
import { getFileDecision } from '../review-coverage.utils';
import { FILE_DECISION_DOTS, FILE_DECISION_LABELS } from '../reviews.enums';
import type { iSnapshotFile } from '../reviews.types';
import { DiffStat } from './diff-stat';
import { FileStatusBadge } from './file-status-badge';

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
  const decision = getFileDecision(useDiffReview().unitsByFile.get(file.id) ?? []);

  useEffect(() => {
    if (isCurrent) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [isCurrent]);

  return (
    <div className="group relative">
      <button
        ref={ref}
        type="button"
        title={`${file.path}\n${describeFileStatus(file)}`}
        aria-current={isCurrent ? 'true' : undefined}
        onClick={() => onSelect(file.path)}
        className="grid h-[30px] w-full grid-cols-[10px_12px_minmax(0,1fr)_auto] items-center gap-2 rounded-sm px-2 text-left text-[12.5px] text-muted hover:bg-hover hover:text-fg aria-current:bg-raised aria-current:text-fg"
      >
        <span
          title={FILE_DECISION_LABELS(decision)}
          className={cn('size-2.5 rounded-full', FILE_DECISION_DOTS(decision))}
        />
        <FileStatusBadge file={file} />
        <span
          className={cn(
            'truncate font-mono text-[12px]',
            file.status === FILE_STATUSES.DELETED && 'text-faint line-through',
          )}
        >
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

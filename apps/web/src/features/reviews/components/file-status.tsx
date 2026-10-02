import { FILE_STATUS_LABELS, FILE_STATUSES, fileStatusesEnumwaii } from '@chaff/common/enums/review.enums';

import { cn } from '@~/lib/utils';

import { fileStatusTitle } from '../file-display.utils';
import type { iFileStatusFile } from '../file-display.utils';
import { FILE_STATUS_BADGES, FILE_STATUS_LETTERS, FILE_STATUS_TONES } from '../reviews.enums';
import type { iSnapshotFile } from '../reviews.types';

/** The git-style letter for a file in a list: A, M, D, R or T. */
export function FileStatusLetter({ file, className }: { file: iFileStatusFile; className?: string }) {
  return (
    <span
      title={fileStatusTitle(file)}
      aria-label={fileStatusTitle(file)}
      className={cn('font-mono text-[11px] font-semibold', FILE_STATUS_TONES(file.status), className)}
    >
      {FILE_STATUS_LETTERS(file.status)}
    </span>
  );
}

/** How many changed files have each status, in git's letters, leaving out statuses no file has. */
export function FileStatusSummary({ files }: { files: readonly iFileStatusFile[] }) {
  const counts = fileStatusesEnumwaii.values
    .map((status) => ({ status, count: files.filter((file) => file.status === status).length }))
    .filter(({ count }) => count > 0);

  return (
    <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 font-mono text-[11px] text-faint tabular-nums">
      {counts.map(({ status, count }) => (
        <span key={status} title={`${count} ${FILE_STATUS_LABELS(status).toLowerCase()}`}>
          <span className={cn('font-semibold', FILE_STATUS_TONES(status))}>{FILE_STATUS_LETTERS(status)}</span> {count}
        </span>
      ))}
    </span>
  );
}

/** A labelled status for a file heading; a plain modification needs no label and shows none. */
export function FileStatusBadge({ file }: { file: iFileStatusFile }) {
  if (file.status === FILE_STATUSES.MODIFIED) return null;

  return (
    <span
      title={fileStatusTitle(file)}
      className={cn(
        'inline-flex h-[19px] items-center rounded-[4px] border px-1.5 text-[11px] font-medium whitespace-nowrap',
        FILE_STATUS_BADGES(file.status),
      )}
    >
      {FILE_STATUS_LABELS(file.status)}
    </span>
  );
}

/** A file's path; a renamed file shows where it came from, a deleted one is struck through. */
export function FilePath({
  file,
  className,
}: {
  file: Pick<iSnapshotFile, 'status' | 'oldPath' | 'path'>;
  className?: string;
}) {
  return (
    <span className={cn('font-mono', className)}>
      {file.oldPath ? (
        <>
          <span className="text-faint">{file.oldPath}</span>
          <span className="text-faint"> → </span>
        </>
      ) : null}
      <span className={file.status === FILE_STATUSES.DELETED ? 'text-muted line-through' : undefined}>{file.path}</span>
    </span>
  );
}

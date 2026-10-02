import { cn } from '@~/lib/utils';

import { describeFileStatus } from '../file-status.utils';
import type { iFileStatusInput } from '../file-status.utils';
import { FILE_STATUS_LETTERS, FILE_STATUS_TEXT_CLASSES } from '../reviews.enums';

interface iFileStatusBadgeProps {
  file: iFileStatusInput;
  className?: string;
}

/** The A, M, D, R or T letter of a changed file; fixed width so rows stay aligned. */
export function FileStatusBadge({ file, className }: iFileStatusBadgeProps) {
  const description = describeFileStatus(file);
  return (
    <span
      role="img"
      title={description}
      aria-label={description}
      className={cn(
        'inline-block w-3 flex-none text-center font-mono text-[11px] leading-none font-semibold select-none',
        FILE_STATUS_TEXT_CLASSES(file.status),
        className,
      )}
    >
      {FILE_STATUS_LETTERS(file.status)}
    </span>
  );
}

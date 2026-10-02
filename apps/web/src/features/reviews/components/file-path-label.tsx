import { FILE_STATUSES } from '@chaff/common/enums/review.enums';

import { cn } from '@~/lib/utils';

import { formatModeChange, renameParts } from '../file-status.utils';
import type { iFileStatusInput } from '../file-status.utils';

interface iFilePathLabelProps {
  file: iFileStatusInput;
  className?: string;
}

/**
 * A changed file's path the way version control tools show it: `src/{old.ts → new.ts}` for a rename or move,
 * struck through when deleted, and the mode change (such as +x) beside it.
 */
export function FilePathLabel({ file, className }: iFilePathLabelProps) {
  const rename = renameParts(file);
  const modeChange = formatModeChange(file.oldMode, file.newMode);
  const isDeleted = file.status === FILE_STATUSES.DELETED;
  const hasBraces = rename !== undefined && (rename.prefix !== '' || rename.suffix !== '');

  return (
    <span className={cn('min-w-0 font-mono', className)}>
      {rename ? (
        <span title={`${file.oldPath} → ${file.path}`}>
          {rename.prefix}
          {hasBraces ? <span className="text-faint">{'{'}</span> : null}
          <span className="text-muted">{rename.from}</span>
          <span className="text-faint">{' → '}</span>
          {rename.to}
          {hasBraces ? <span className="text-faint">{'}'}</span> : null}
          {rename.suffix}
        </span>
      ) : (
        <span className={cn(isDeleted && 'text-muted line-through')}>{file.path}</span>
      )}
      {modeChange ? (
        <span title={`File mode ${file.oldMode} → ${file.newMode}`} className="ml-1.5 text-[11px] text-faint">
          {modeChange}
        </span>
      ) : null}
    </span>
  );
}

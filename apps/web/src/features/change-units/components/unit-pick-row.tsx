import { UNIT_KIND_LABELS, UNIT_MARK_SEGMENT_CLASSES } from '@~/features/focus/focus.enums';
import { FileStatusBadge } from '@~/features/reviews/components/file-status-badge';
import type { iSnapshotFile, iUnit } from '@~/features/reviews/reviews.types';
import { cn } from '@~/lib/utils';

interface iUnitPickRowProps {
  unit: iUnit;
  file: iSnapshotFile | undefined;
  isPicked: boolean;
  onToggle: () => void;
}

/** A unit that can be picked to group, move or take out of a change. */
export function UnitPickRow({ unit, file, isPicked, onToggle }: iUnitPickRowProps) {
  return (
    <label className="flex h-7 cursor-pointer items-center gap-2 rounded-sm px-1.5 text-[12.5px] hover:bg-hover">
      <input type="checkbox" checked={isPicked} onChange={onToggle} className="size-3.5 flex-none accent-accent" />
      <span
        className={cn(
          'size-2 flex-none rounded-full bg-line-strong',
          unit.mark && UNIT_MARK_SEGMENT_CLASSES(unit.mark),
        )}
      />
      <span className="flex-none text-faint">{UNIT_KIND_LABELS(unit.kind)}</span>
      <span className="min-w-0 truncate font-mono text-fg">{unit.title}</span>
      {file ? (
        <span className="ml-auto flex min-w-0 items-center gap-1.5">
          <FileStatusBadge file={file} className="text-[10.5px]" />
          <span className="min-w-0 truncate font-mono text-[11px] text-faint">{file.path}</span>
        </span>
      ) : null}
    </label>
  );
}

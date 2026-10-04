import type { iSnapshotFile, iUnit } from '@~/features/reviews/reviews.types';
import { cn } from '@~/lib/utils';

import { UNIT_KIND_LABELS, UNIT_MARK_LABELS, UNIT_MARK_SEGMENT_CLASSES } from '../focus.enums';
import { useUnitDetail } from '../hooks/use-unit-detail';
import { useUnitUsages } from '../hooks/use-unit-usages';
import { UnitCodeView } from './unit-code-view';
import { UnitUsagesView } from './unit-usages-view';

interface iChangeMemberProps {
  snapshotId: string;
  unit: iUnit;
  file: iSnapshotFile | undefined;
  onOpenInEditor: (path: string, line?: number) => void;
}

/** One unit's name inside a change, with its own decision. */
function MemberTitle({ unit }: { unit: iUnit }) {
  return (
    <div className="flex items-center gap-2 border-t border-line px-[22px] pt-3 pb-2 text-[12.5px]">
      <span
        className={cn(
          'size-2 flex-none rounded-full bg-line-strong',
          unit.mark && UNIT_MARK_SEGMENT_CLASSES.get(unit.mark),
        )}
      />
      <span className="text-faint">{UNIT_KIND_LABELS.get(unit.kind)}</span>
      <span className="min-w-0 truncate font-mono text-fg">{unit.title}</span>
      {unit.mark ? <span className="ml-auto flex-none text-muted">{UNIT_MARK_LABELS.get(unit.mark)}</span> : null}
    </div>
  );
}

/** A unit of a change, as code. */
export function ChangeMemberCode({ snapshotId, unit, file, onOpenInEditor }: iChangeMemberProps) {
  const { data: detail } = useUnitDetail(snapshotId, [unit.id]);
  if (!file) return null;
  return (
    <section aria-label={unit.title}>
      <MemberTitle unit={unit} />
      <UnitCodeView snapshotId={snapshotId} unit={unit} file={file} detail={detail} onOpenInEditor={onOpenInEditor} />
    </section>
  );
}

/** A unit of a change, with where it is used. */
export function ChangeMemberUsages({ snapshotId, unit, onOpenInEditor }: Omit<iChangeMemberProps, 'file'>) {
  const { data: usages } = useUnitUsages(snapshotId, unit.id);
  return (
    <section aria-label={unit.title}>
      <MemberTitle unit={unit} />
      <UnitUsagesView usages={usages} onOpenInEditor={onOpenInEditor} />
    </section>
  );
}

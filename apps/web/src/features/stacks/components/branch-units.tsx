import { useQuery } from '@tanstack/react-query';

import { SectionLabel } from '@~/components/ui/section-label';
import { UNIT_MARK_LABELS, UNIT_MARK_SEGMENT_CLASSES } from '@~/features/focus/focus.enums';
import { cn } from '@~/lib/utils';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

const SHOWN_UNITS = 12;

/** The first units of the branch's snapshot with the decision on each. */
export function BranchUnits({ snapshotId }: { snapshotId: string }) {
  const { data: units = [] } = useQuery(tanstackRPC.reviews.units.queryOptions({ input: { snapshotId } }));
  const hidden = units.length - SHOWN_UNITS;

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Units</SectionLabel>
      <ul className="m-0 flex list-none flex-col p-0">
        {units.slice(0, SHOWN_UNITS).map((unit) => (
          <li key={unit.id} className="flex h-8 items-center gap-2.5 text-[13px]">
            <span
              aria-hidden="true"
              className={cn(
                'size-2 flex-none rounded-[2px] bg-line-strong',
                unit.mark && UNIT_MARK_SEGMENT_CLASSES.get(unit.mark),
              )}
            />
            <span className="min-w-0 flex-1 truncate text-fg">{unit.title}</span>
            <span className="font-mono text-[11.5px] text-faint">
              {unit.mark ? UNIT_MARK_LABELS.get(unit.mark).toLowerCase() : 'not reviewed'}
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 ? <span className="text-[12px] text-faint">and {hidden} more</span> : null}
    </section>
  );
}

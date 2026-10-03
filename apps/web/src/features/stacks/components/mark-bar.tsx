import { UNIT_MARK_SEGMENT_CLASSES } from '@~/features/focus/focus.enums';
import type { iSnapshotSummary } from '@~/features/reviews/reviews.types';
import { cn } from '@~/lib/utils';

import { markSegments } from '../stack.utils';

/** Above this many units a branch's bar groups units by decision instead of drawing one segment each. */
const MAX_UNIT_SEGMENTS = 40;

/** A branch's units as a bar of segments, decided first; grey until a review is started. */
export function MarkBar({ summary }: { summary: iSnapshotSummary | undefined }) {
  const segments = summary ? markSegments(summary) : [];
  const isPerUnit = summary !== undefined && summary.unitCount <= MAX_UNIT_SEGMENTS;

  return (
    <div aria-hidden="true" className="mt-2.5 flex h-[5px] gap-[3px] overflow-hidden rounded-full">
      {segments.length === 0 ? <span className="flex-1 rounded-full bg-raised" /> : null}
      {segments.flatMap((segment) => {
        const className = cn(
          'basis-0 rounded-full',
          segment.mark ? UNIT_MARK_SEGMENT_CLASSES.get(segment.mark) : 'bg-raised',
        );
        const key = segment.mark ?? 'undecided';
        if (!isPerUnit) return [<span key={key} style={{ flexGrow: segment.count }} className={className} />];
        return Array.from({ length: segment.count }, (_, index) => (
          <span key={`${key}:${index}`} className={cn('flex-1', className)} />
        ));
      })}
    </div>
  );
}

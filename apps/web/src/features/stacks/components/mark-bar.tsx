import { UNIT_MARK_SEGMENT_CLASSES } from '@~/features/focus/focus.enums';
import type { iSnapshotSummary } from '@~/features/reviews/reviews.types';
import { cn } from '@~/lib/utils';

import { markSegments } from '../stack.utils';

/** A branch's units as one bar, split by decision; grey until a review is started. */
export function MarkBar({ summary }: { summary: iSnapshotSummary | undefined }) {
  const segments = summary ? markSegments(summary) : [];

  return (
    <div aria-hidden="true" className="mt-2.5 flex h-[5px] gap-[3px] overflow-hidden rounded-full">
      {segments.length === 0 ? <span className="flex-1 rounded-full bg-raised" /> : null}
      {segments.map((segment) => (
        <span
          key={segment.mark ?? 'undecided'}
          style={{ flexGrow: segment.count }}
          className={cn('basis-0 rounded-full', segment.mark ? UNIT_MARK_SEGMENT_CLASSES(segment.mark) : 'bg-raised')}
        />
      ))}
    </div>
  );
}

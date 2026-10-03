import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import type { iSnapshot, iUnit } from '@~/features/reviews/reviews.types';

import { discussionsInRange } from '../code-hosts.utils';
import { useDiscussions } from '../hooks/use-discussions';
import { DiscussionThread } from './discussion-thread';

interface iUnitDiscussionsProps {
  snapshot: iSnapshot;
  unit: iUnit;
  path: string | undefined;
}

/** Merge request threads on the unit's lines, shown above its code. */
export function UnitDiscussions({ snapshot, unit, path }: iUnitDiscussionsProps) {
  const discussions = useDiscussions(snapshot.id, snapshot.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST);
  const shown = path ? discussionsInRange(discussions, path, unit.newStartLine, unit.newEndLine) : [];
  if (shown.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-line bg-canvas px-[22px] py-3">
      {shown.map((discussion) => (
        <DiscussionThread key={discussion.id} discussion={discussion} className="bg-surface" />
      ))}
    </div>
  );
}

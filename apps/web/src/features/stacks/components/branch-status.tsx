import { useQuery } from '@tanstack/react-query';

import { Button } from '@~/components/ui/button';
import { Callout } from '@~/components/ui/callout';
import { useLiveStatus } from '@~/features/reviews/hooks/use-live-status';
import { useRefreshReview } from '@~/features/reviews/hooks/use-refresh-review';
import { describeChange } from '@~/features/reviews/live-status.utils';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

interface iBranchStatusProps {
  targetId: string;
  snapshotId: string;
}

/** Says what moved since the branch's snapshot and offers to freeze a new one. */
export function BranchStatus({ targetId, snapshotId }: iBranchStatusProps) {
  const { data: snapshot } = useQuery(tanstackRPC.reviews.snapshot.queryOptions({ input: { snapshotId } }));
  const status = useLiveStatus(snapshotId);
  const refresh = useRefreshReview({ shouldStay: true });
  const change = snapshot ? describeChange(snapshot, status) : undefined;
  if (!snapshot || !change || status?.isBranchMissing) return null;

  return (
    <div className="flex flex-col gap-2.5">
      <Callout variant="warn">
        Since snapshot <span className="font-mono">{snapshot.headSha.slice(0, 7)}</span>: {change}. Your decisions stay
        on that snapshot; updating carries them over to every unit that did not change.
      </Callout>
      <div>
        <Button size="sm" disabled={refresh.isPending} onClick={() => refresh.mutate({ targetId })}>
          {refresh.isPending ? 'Updating...' : 'Update snapshot'}
        </Button>
      </div>
    </div>
  );
}

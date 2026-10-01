import { Button } from '@~/components/ui/button';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';

import { useLiveStatus } from '../hooks/use-live-status';
import { useRefreshReview } from '../hooks/use-refresh-review';
import type { iSnapshot, iSnapshotLiveStatus } from '../reviews.types';

const SHORT_SHA_LENGTH = 7;

function describeChange(snapshot: iSnapshot, status: iSnapshotLiveStatus | undefined) {
  if (!status) return undefined;
  if (status.isBranchMissing) return 'branch deleted';
  if (status.isBranchRewritten) return 'branch rewritten';
  if (status.newCommitCount > 0) return pluralize(status.newCommitCount, 'new commit');
  if (status.isParentMoved) return `${snapshot.parentBranch} moved`;
  if (snapshot.version < snapshot.latestVersion) return 'newer snapshot';
  return undefined;
}

/** The frozen snapshot being reviewed and what changed on disk since; Update freezes a new one. */
export function SnapshotChip({ snapshot }: { snapshot: iSnapshot }) {
  const status = useLiveStatus(snapshot.id);
  const refresh = useRefreshReview();
  const change = describeChange(snapshot, status);
  const canUpdate = change !== undefined && !status?.isBranchMissing;

  return (
    <div className="flex items-center gap-2">
      <span
        title={
          change
            ? `You are reviewing a frozen snapshot: ${change} since it was taken.`
            : 'You are reviewing a frozen snapshot of this branch.'
        }
        className="inline-flex items-center gap-[7px] rounded-full border border-line px-2.5 py-1 text-[12.5px] text-muted"
      >
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', change ? 'bg-warn' : 'bg-good')} />
        <span className="font-mono">{snapshot.headSha.slice(0, SHORT_SHA_LENGTH)}</span>
        {change ? <span>· {change}</span> : null}
      </span>
      {canUpdate ? (
        <Button size="sm" disabled={refresh.isPending} onClick={() => refresh.mutate({ targetId: snapshot.targetId })}>
          {refresh.isPending ? 'Updating...' : 'Update'}
        </Button>
      ) : null}
    </div>
  );
}

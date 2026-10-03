import { useQuery } from '@tanstack/react-query';

import { Button } from '@~/components/ui/button';
import { DiscussionThread } from '@~/features/code-hosts/components/discussion-thread';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

const overviewDiscussionsQueryOptions = tanstackRPC.codeHosts.discussions.queryOptions;

export function OverviewDiscussions({ snapshotId }: { snapshotId: string }) {
  const query = useQuery(overviewDiscussionsQueryOptions({ input: { snapshotId }, staleTime: 60_000 }));
  return (
    <section
      aria-label="Merge request discussions"
      className="flex flex-col gap-3 border-t border-line px-5 py-6 lg:px-8"
    >
      <h2 className="m-0 text-base font-semibold">Discussions</h2>
      {query.isPending ? (
        <p role="status" className="text-sm text-muted">
          Loading discussions...
        </p>
      ) : null}
      {query.error ? (
        <div role="alert">
          <p className="text-sm text-bad">{getErrorMessage(query.error)}</p>
          <Button onClick={async () => query.refetch()}>Retry discussions</Button>
        </div>
      ) : null}
      {query.data?.length === 0 ? <p className="text-sm text-muted">No discussions on this merge request.</p> : null}
      {query.data?.map((discussion) => (
        <DiscussionThread key={discussion.id} discussion={discussion} />
      ))}
    </section>
  );
}

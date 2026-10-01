import { createFileRoute } from '@tanstack/react-router';

import { FullDiffScreen } from '@~/features/reviews/components/full-diff-screen';
import { snapshotQueryOptions } from '@~/features/reviews/hooks/use-snapshot';
import { workspacesQueryOptions } from '@~/features/workspaces/hooks/use-workspaces';

export const Route = createFileRoute('/reviews/$snapshotId')({
  loader: async ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(snapshotQueryOptions(params.snapshotId)),
      context.queryClient.ensureQueryData(workspacesQueryOptions),
    ]),
  component: FullDiffRoute,
});

function FullDiffRoute() {
  const { snapshotId } = Route.useParams();
  return <FullDiffScreen key={snapshotId} snapshotId={snapshotId} />;
}

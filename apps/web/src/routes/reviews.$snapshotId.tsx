import { Outlet, createFileRoute } from '@tanstack/react-router';

import { snapshotQueryOptions } from '@~/features/reviews/hooks/use-snapshot';
import { workspacesQueryOptions } from '@~/features/workspaces/hooks/use-workspaces';

export const Route = createFileRoute('/reviews/$snapshotId')({
  loader: async ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(snapshotQueryOptions(params.snapshotId)),
      context.queryClient.ensureQueryData(workspacesQueryOptions),
    ]),
  component: Outlet,
});

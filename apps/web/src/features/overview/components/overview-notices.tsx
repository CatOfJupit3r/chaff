import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

import { Button } from '@~/components/ui/button';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { useOverview } from '../hooks/use-overview';

export function OverviewNotices({ overview }: { overview: ReturnType<typeof useOverview> }) {
  const { workspace, stacksQuery, branchesQuery, reviews } = overview;
  const queryClient = useQueryClient();
  const retry = async () => {
    await Promise.all([
      reviews.refetch(),
      queryClient.invalidateQueries({ queryKey: tanstackRPC.stacks.key() }),
      queryClient.invalidateQueries({ queryKey: tanstackRPC.workspaces.branches.key() }),
    ]);
  };
  const errors = [stacksQuery.error, branchesQuery.error, reviews.error].flatMap((error) =>
    error ? [getErrorMessage(error)] : [],
  );
  return (
    <>
      {overview.isLoading ? (
        <p role="status" className="m-0 border-b border-line px-6 py-3 text-sm text-muted">
          Loading stacks and reviews...
        </p>
      ) : null}
      {errors.length > 0 ? (
        <div role="alert" className="border-b border-line px-6 py-3 text-sm text-bad">
          {[...new Set(errors)].map((error) => (
            <p key={error}>{error}</p>
          ))}
          <Button size="sm" onClick={retry}>
            Retry loading
          </Button>
        </div>
      ) : null}
      {workspace && !workspace.isAvailable ? (
        <p className="m-0 border-b border-line px-6 py-3 text-sm text-warn">
          This repository is unavailable on disk, so its stacks cannot be read.
        </p>
      ) : null}
      {!overview.hasConnections ? (
        <p className="m-0 border-b border-line px-6 py-3 text-sm text-muted">
          <Link to="/settings" className="text-accent hover:underline">
            Connect GitLab or GitHub
          </Link>{' '}
          to get merge requests as stack suggestions and import their chains.
        </p>
      ) : null}
    </>
  );
}

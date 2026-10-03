import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

import { Button } from '@~/components/ui/button';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { useOverview } from '../hooks/use-overview';

export function OverviewNotices({ overview }: { overview: ReturnType<typeof useOverview> }) {
  const { workspace, inbox, local, reviews } = overview;
  const queryClient = useQueryClient();
  const retry = async () => {
    await Promise.all([
      inbox.hasConnections ? inbox.refetch() : Promise.resolve(),
      reviews.refetch(),
      workspace
        ? queryClient.invalidateQueries({
            queryKey: tanstackRPC.workspaces.branches.key({ input: { workspaceId: workspace.id } }),
          })
        : Promise.resolve(),
    ]);
  };
  const errors = [
    ...local.failures.map((failure) => getErrorMessage(failure.error)),
    ...inbox.projects
      .filter((project) => project.workspaceId === workspace?.id && project.error)
      .map((project) => project.error),
    inbox.error ? getErrorMessage(inbox.error) : undefined,
    reviews.error ? getErrorMessage(reviews.error) : undefined,
  ].filter(Boolean);
  return (
    <>
      {overview.isLoading ? (
        <p role="status" className="m-0 border-b border-line px-6 py-3 text-sm text-muted">
          Loading branches and reviews...
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
          This repository is unavailable on disk. Hosted reviews are still shown when available.
        </p>
      ) : null}
      {!inbox.hasConnections ? (
        <p className="m-0 border-b border-line px-6 py-3 text-sm text-muted">
          <Link to="/settings" className="text-accent hover:underline">
            Connect GitLab or GitHub
          </Link>{' '}
          to show merge requests beside local branches.
        </p>
      ) : null}
    </>
  );
}

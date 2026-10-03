import { createFileRoute } from '@tanstack/react-router';

import { FullDiffScreen } from '@~/features/reviews/components/full-diff-screen';

export const Route = createFileRoute('/reviews/$snapshotId/diff')({
  component: FullDiffRoute,
});

function FullDiffRoute() {
  const { snapshotId } = Route.useParams();
  return <FullDiffScreen key={snapshotId} snapshotId={snapshotId} />;
}

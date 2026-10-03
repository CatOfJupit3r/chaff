import { createFileRoute } from '@tanstack/react-router';

import { FocusScreen } from '@~/features/focus/components/focus-screen';
import { unitsQueryOptions } from '@~/features/focus/hooks/use-units';

export const Route = createFileRoute('/reviews/$snapshotId/')({
  loader: async ({ context, params }) => context.queryClient.ensureQueryData(unitsQueryOptions(params.snapshotId)),
  component: FocusRoute,
});

function FocusRoute() {
  const { snapshotId } = Route.useParams();
  return <FocusScreen key={snapshotId} snapshotId={snapshotId} />;
}

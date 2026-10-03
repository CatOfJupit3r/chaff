import { createFileRoute } from '@tanstack/react-router';

import { ExportScreen } from '@~/features/exports/components/export-screen';

export const Route = createFileRoute('/reviews/$snapshotId/export')({
  component: ExportRoute,
});

function ExportRoute() {
  const { snapshotId } = Route.useParams();
  return <ExportScreen key={snapshotId} snapshotId={snapshotId} />;
}

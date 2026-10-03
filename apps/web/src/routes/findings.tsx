import { createFileRoute } from '@tanstack/react-router';

import { FindingsScreen } from '@~/features/findings/components/findings-screen';
import { workspacesQueryOptions } from '@~/features/workspaces/hooks/use-workspaces';

export const Route = createFileRoute('/findings')({
  loader: async ({ context }) => context.queryClient.ensureQueryData(workspacesQueryOptions),
  component: FindingsScreen,
});

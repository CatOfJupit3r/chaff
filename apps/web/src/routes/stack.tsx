import { createFileRoute } from '@tanstack/react-router';

import { StackScreen } from '@~/features/stacks/components/stack-screen';
import { workspacesQueryOptions } from '@~/features/workspaces/hooks/use-workspaces';

export const Route = createFileRoute('/stack')({
  loader: async ({ context }) => context.queryClient.ensureQueryData(workspacesQueryOptions),
  component: StackScreen,
});

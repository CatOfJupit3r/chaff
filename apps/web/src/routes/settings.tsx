import { createFileRoute } from '@tanstack/react-router';

import { SettingsScreen } from '@~/features/code-hosts/components/settings-screen';
import { workspacesQueryOptions } from '@~/features/workspaces/hooks/use-workspaces';

export const Route = createFileRoute('/settings')({
  loader: async ({ context }) => context.queryClient.ensureQueryData(workspacesQueryOptions),
  component: SettingsScreen,
});

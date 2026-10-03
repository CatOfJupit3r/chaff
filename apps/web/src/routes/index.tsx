import { createFileRoute } from '@tanstack/react-router';

import { ReviewsScreen } from '@~/features/workspaces/components/reviews-screen';
import { workspacesQueryOptions } from '@~/features/workspaces/hooks/use-workspaces';

export const Route = createFileRoute('/')({
  loader: async ({ context }) => context.queryClient.ensureQueryData(workspacesQueryOptions),
  component: ReviewsScreen,
});

import { createFileRoute } from '@tanstack/react-router';

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@~/components/ui/empty';

export const Route = createFileRoute('/_auth_only/dashboard')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex bg-background">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No reviews yet</EmptyTitle>
          <EmptyDescription>Reviews will appear here once a GitLab project is connected.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

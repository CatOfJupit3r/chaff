import { Link, createFileRoute } from '@tanstack/react-router';

import { Badge } from '@~/components/ui/badge';
import { Button } from '@~/components/ui/button/button';
import { Logo } from '@~/components/ui/logo';
import { useMe } from '@~/features/user/hooks/use-me';
import { useHealthCheck } from '@~/hooks/queries/use-health-check';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

function StatusBadge() {
  const { data, isPending, error } = useHealthCheck();

  if (isPending) return <Badge variant="outline">Checking server...</Badge>;

  if (error || data?.status !== 'OK') return <Badge variant="destructive">Server unreachable</Badge>;

  return <Badge variant="secondary">Server online</Badge>;
}

function HomeComponent() {
  const { isLoggedIn } = useMe();

  return (
    <div className="flex items-center justify-center bg-background px-4">
      <div className="flex max-w-xl flex-col items-center gap-6 text-center">
        <Logo className="size-16 text-foreground" />
        <StatusBadge />
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">Chaff</h1>
        <p className="text-muted-foreground">Stack-aware review workspace for AI-written merge requests.</p>
        {isLoggedIn ? (
          <Button render={<Link to="/dashboard" />}>Open reviews</Button>
        ) : (
          <Button render={<Link to="/auth" />}>Sign in</Button>
        )}
      </div>
    </div>
  );
}

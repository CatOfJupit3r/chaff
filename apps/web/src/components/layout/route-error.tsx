import type { ErrorComponentProps } from '@tanstack/react-router';

import { Button } from '@~/components/ui/button';
import { getErrorMessage } from '@~/utils/rpc-errors';

export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="flex max-w-[420px] flex-col items-start gap-3">
        <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em]">Something went wrong</h1>
        <p className="m-0 text-muted">{getErrorMessage(error)}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}

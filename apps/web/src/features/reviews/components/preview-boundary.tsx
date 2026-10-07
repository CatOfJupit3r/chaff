import type { ReactNode } from 'react';

import { ErrorBoundary } from '@~/components/layout/error-boundary';
import type { iErrorFallbackProps } from '@~/components/layout/error-boundary';
import { Button } from '@~/components/ui/button';
import { getErrorMessage } from '@~/utils/rpc-errors';

import { FileNote } from './file-notes';

/** A drawn preview that fails shows a note in its place instead of breaking the screen. */
export function PreviewBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary fallback={PreviewFailure}>{children}</ErrorBoundary>;
}

function PreviewFailure({ error, reset }: iErrorFallbackProps) {
  return (
    <FileNote
      action={
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
      }
    >
      This preview could not be drawn: {getErrorMessage(error)}
    </FileNote>
  );
}

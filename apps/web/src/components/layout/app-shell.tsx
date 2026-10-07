import type { ReactNode } from 'react';

import { useFindingsWatch } from '@~/features/findings/hooks/use-findings-watch';
import { KeyListDialog } from '@~/features/keys/components/key-list-dialog';

import { AppRail } from './app-rail';

/** Slim icon rail plus one main column; each screen renders its own top bar and content. */
export function AppShell({ children }: { children: ReactNode }) {
  useFindingsWatch();

  return (
    <div className="grid h-full grid-cols-[64px_minmax(0,1fr)]">
      <AppRail />
      <div className="flex min-h-0 min-w-0 flex-col">{children}</div>
      <KeyListDialog />
    </div>
  );
}

import type { ReactNode } from 'react';

import { AppearanceButton } from '@~/features/appearance/components/appearance-button';
import { EditorButton } from '@~/features/editor/components/editor-button';

/** Breadcrumbs on the left, app-wide controls on the right. */
export function TopBar({ children }: { children: ReactNode }) {
  return (
    <header className="flex h-[52px] flex-none items-center gap-3 border-b border-line px-5">
      <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-muted">{children}</div>
      <div className="ml-auto flex flex-none items-center gap-2.5">
        <AppearanceButton />
        <EditorButton />
      </div>
    </header>
  );
}

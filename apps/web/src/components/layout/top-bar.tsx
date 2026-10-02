import type { ReactNode } from 'react';

import { AppearanceButton } from '@~/features/appearance/components/appearance-button';
import { EditorButton } from '@~/features/editor/components/editor-button';
import { JumpButton } from '@~/features/jump/components/jump-button';

interface iTopBarProps {
  /** Breadcrumbs. */
  children: ReactNode;
  /** Screen-specific status shown before the app-wide controls. */
  end?: ReactNode;
}

/** Breadcrumbs on the left, app-wide controls on the right. */
export function TopBar({ children, end }: iTopBarProps) {
  return (
    <header className="flex h-[52px] flex-none items-center gap-3 border-b border-line px-5">
      <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-muted">{children}</div>
      <div className="ml-auto flex flex-none items-center gap-2.5">
        {end}
        <JumpButton />
        <AppearanceButton />
        <EditorButton />
      </div>
    </header>
  );
}

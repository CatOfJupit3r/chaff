import type { ReactNode } from 'react';

/** Scrollable screen body with the standard page padding. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-0 flex-1 scrollbar-gutter-stable overflow-auto">
      <div className="px-8 pt-7 pb-12">{children}</div>
    </main>
  );
}

import type { ReactNode } from 'react';

import { DIFF_LAYOUTS } from '@chaff/common/enums/diff.enums';
import type { DiffLayout } from '@chaff/common/enums/diff.enums';

import { cn } from '@~/lib/utils';

interface iPreviewSidesProps {
  layout: DiffLayout;
  /** The drawn old version; left out when the file did not exist before. */
  before?: ReactNode;
  /** The drawn new version; left out when the file was deleted. */
  after?: ReactNode;
}

/** Both versions of a drawn file, beside each other in the split layout and stacked otherwise. */
export function PreviewSides({ layout, before, after }: iPreviewSidesProps) {
  const isSplit = layout === DIFF_LAYOUTS.split && before !== undefined && after !== undefined;

  return (
    <div className={cn('grid gap-4 p-4', isSplit ? 'grid-cols-2' : 'grid-cols-1')}>
      {before === undefined ? null : <PreviewSide label="Before">{before}</PreviewSide>}
      {after === undefined ? null : <PreviewSide label="After">{after}</PreviewSide>}
    </div>
  );
}

function PreviewSide({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="flex min-w-0 flex-col gap-2">
      <span className="text-[11px] font-medium tracking-wide text-faint uppercase">{label}</span>
      {children}
    </section>
  );
}

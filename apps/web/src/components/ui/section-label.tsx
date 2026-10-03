import type { ComponentProps } from 'react';

import { cn } from '@~/lib/utils';

/** Small uppercase label used for group headings. */
export function SectionLabel({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span className={cn('text-[11px] font-medium tracking-[0.08em] text-faint uppercase', className)} {...props} />
  );
}

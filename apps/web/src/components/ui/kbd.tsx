import type { ComponentProps } from 'react';

import { cn } from '@~/lib/utils';

/** A key on the keyboard, shown next to the action it triggers. */
export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-b-2 border-line-strong bg-surface px-1 font-mono text-[10.5px] leading-none font-medium text-muted',
        className,
      )}
      {...props}
    />
  );
}

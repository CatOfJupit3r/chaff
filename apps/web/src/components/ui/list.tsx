import type { ComponentProps } from 'react';

import { cn } from '@~/lib/utils';

/** Bordered surface holding a stack of rows separated by hairlines. */
export function List({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('overflow-hidden rounded-lg border border-line bg-surface', className)} {...props} />;
}

/** Row with a flexible main column and an auto-sized side column. */
export function ListRow({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-line px-4 py-3.5 first:border-t-0 hover:bg-raised',
        className,
      )}
      {...props}
    />
  );
}

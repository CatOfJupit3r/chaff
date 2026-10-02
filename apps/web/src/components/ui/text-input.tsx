import type { ComponentProps } from 'react';

import { cn } from '@~/lib/utils';

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-8 w-full min-w-0 rounded-sm border border-line-strong bg-surface px-2.5 text-[13px] text-fg outline-none placeholder:text-faint focus:border-accent-line',
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-16 w-full min-w-0 resize-y rounded-sm border border-line-strong bg-surface px-2.5 py-2 text-[13px] leading-normal text-fg outline-none placeholder:text-faint focus:border-accent-line',
        className,
      )}
      {...props}
    />
  );
}

export function SelectInput({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-8 min-w-0 rounded-sm border border-line-strong bg-surface px-2 text-[13px] text-fg outline-none focus:border-accent-line',
        className,
      )}
      {...props}
    />
  );
}

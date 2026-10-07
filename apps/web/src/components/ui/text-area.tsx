import type { ComponentProps } from 'react';

import { cn } from '@~/lib/utils';

interface iTextAreaProps extends Omit<ComponentProps<'textarea'>, 'onSubmit'> {
  /** Enter calls it; Shift+Enter adds a line. */
  onSubmit?: () => unknown;
  onEscape?: () => unknown;
}

export function TextArea({ className, onSubmit, onEscape, onKeyDown, ...props }: iTextAreaProps) {
  return (
    <textarea
      className={cn(
        'w-full resize-none rounded-sm border border-line-strong bg-canvas px-3 py-2 text-[13px] leading-normal text-fg outline-none placeholder:text-faint focus:border-accent-line',
        className,
      )}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === 'Escape' && onEscape) {
          event.preventDefault();
          onEscape();
        } else if (event.key === 'Enter' && !event.shiftKey && onSubmit) {
          event.preventDefault();
          onSubmit();
        }
      }}
      {...props}
    />
  );
}

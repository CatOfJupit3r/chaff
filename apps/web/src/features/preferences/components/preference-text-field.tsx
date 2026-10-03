import type { ComponentProps } from 'react';

import { cn } from '@~/lib/utils';

/** Multi-line text for a preference, as a rule an agent can follow. */
export function PreferenceTextField({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      aria-label="Preference"
      placeholder="Prefer one shared mechanism with semantic helpers over parallel implementations."
      className={cn(
        'min-h-[72px] w-full resize-y rounded-sm border border-line-strong bg-canvas px-3 py-2 text-[13px] text-fg outline-none placeholder:text-faint focus:border-accent-line',
        className,
      )}
      {...props}
    />
  );
}

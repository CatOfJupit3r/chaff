import type { ReactNode, SVGProps } from 'react';

import { cn } from '@~/lib/utils';

export type IconComponent = ReturnType<typeof createIcon>;

/** Stroke icons drawn on a 24px grid; size them with `size-*` and color them with token classes. */
export function createIcon(displayName: string, paths: ReactNode) {
  function Icon({ className, ...props }: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={cn('size-4 flex-none', className)}
        {...props}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

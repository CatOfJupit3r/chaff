import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

import { AlertIcon } from '@~/components/icons/icons';
import { cn } from '@~/lib/utils';

const calloutVariants = cva('flex gap-2.5 rounded-sm border px-3 py-2.5 text-[12.5px]', {
  variants: {
    variant: {
      warn: 'border-warn-line bg-warn-soft text-warn-fg [&_svg]:text-warn',
      info: 'border-line bg-canvas text-muted [&_svg]:text-muted',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

interface iCalloutProps extends VariantProps<typeof calloutVariants> {
  children: ReactNode;
  className?: string;
}

export function Callout({ variant, className, children }: iCalloutProps) {
  return (
    <div className={cn(calloutVariants({ variant }), className)}>
      <AlertIcon className="mt-0.5 size-[15px]" />
      <span>{children}</span>
    </div>
  );
}

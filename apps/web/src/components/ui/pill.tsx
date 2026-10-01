import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@~/lib/utils';

const pillVariants = cva(
  'inline-flex h-[21px] items-center gap-[5px] rounded-full border border-transparent px-2 text-[11.5px] font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        open: 'bg-warn-soft text-warn',
        fix: 'bg-accent-soft text-accent',
        ok: 'bg-good-soft text-good',
        out: 'border-line-strong text-muted',
        question: 'border-accent-line text-accent',
        neutral: 'bg-raised text-muted',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

interface iPillProps extends ComponentProps<'span'>, VariantProps<typeof pillVariants> {}

export function Pill({ className, variant, ...props }: iPillProps) {
  return <span className={cn(pillVariants({ variant }), className)} {...props} />;
}

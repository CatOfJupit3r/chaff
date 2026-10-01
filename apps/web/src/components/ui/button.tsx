import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@~/lib/utils';

import { buttonVariants } from './button-variants';

export interface iButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type, ...props }: iButtonProps) {
  return (
    <button
      type={type === 'submit' ? 'submit' : 'button'}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

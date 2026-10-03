import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex flex-none items-center justify-center gap-2 rounded-sm border whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        default: 'border-line-strong bg-surface text-fg hover:bg-hover',
        primary: 'border-fg bg-fg font-medium text-canvas hover:border-primary-hover hover:bg-primary-hover',
        ghost:
          'border-transparent bg-transparent text-muted hover:bg-hover hover:text-fg aria-pressed:border-line aria-pressed:bg-raised aria-pressed:text-fg',
        icon: 'border-line bg-transparent text-muted hover:bg-hover hover:text-fg [&_svg]:size-[15px]',
      },
      size: {
        default: 'h-8 px-3 text-[13px]',
        sm: 'h-[26px] px-[9px] text-[12px]',
        icon: 'size-[30px] p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

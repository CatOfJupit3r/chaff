import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import type { ComponentProps, ReactNode } from 'react';

import { CloseIcon } from '@~/components/icons/icons';
import { cn } from '@~/lib/utils';

import { buttonVariants } from './button-variants';

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root {...props} />;
}

function DialogContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-70 bg-scrim" />
      <div className="pointer-events-none fixed inset-0 z-70 grid place-items-center p-4">
        <DialogPrimitive.Popup
          className={cn(
            'pointer-events-auto max-h-full w-[min(520px,100%)] overflow-auto rounded-xl border border-line-strong bg-surface shadow-modal',
            className,
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Popup>
      </div>
    </DialogPrimitive.Portal>
  );
}

interface iDialogHeaderProps {
  title: ReactNode;
  description?: ReactNode;
}

function DialogHeader({ title, description }: iDialogHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-[18px] pb-1.5">
      <div>
        <DialogPrimitive.Title className="m-0 text-[17px] font-semibold tracking-[-0.015em] text-balance">
          {title}
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="mt-1 text-[13px] text-muted">
            {description}
          </DialogPrimitive.Description>
        ) : null}
      </div>
      <DialogPrimitive.Close aria-label="Close" className={buttonVariants({ variant: 'icon', size: 'icon' })}>
        <CloseIcon />
      </DialogPrimitive.Close>
    </div>
  );
}

function DialogBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-4 px-5 pt-2 pb-[18px]', className)} {...props} />;
}

function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap justify-end gap-2', className)} {...props} />;
}

const DialogClose = DialogPrimitive.Close;

export { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader };

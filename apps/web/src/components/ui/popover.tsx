import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '@~/lib/utils';

function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root {...props} />;
}

interface iPopoverContentProps
  extends PopoverPrimitive.Popup.Props, Pick<PopoverPrimitive.Positioner.Props, 'side' | 'align' | 'sideOffset'> {}

function PopoverContent({
  className,
  side = 'right',
  align = 'start',
  sideOffset = 10,
  ...props
}: iPopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner side={side} align={align} sideOffset={sideOffset} className="z-60">
        <PopoverPrimitive.Popup
          className={cn(
            'max-h-[min(600px,var(--available-height))] w-[min(420px,calc(100vw-32px))] overflow-auto rounded-xl border border-line-strong bg-surface shadow-modal outline-none',
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverTitle = PopoverPrimitive.Title;
const PopoverDescription = PopoverPrimitive.Description;
const PopoverClose = PopoverPrimitive.Close;

export { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger };

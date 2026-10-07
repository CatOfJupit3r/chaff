import { useState } from 'react';
import type { ReactNode } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@~/components/ui/popover';
import { cn } from '@~/lib/utils';

import { StackSlotOptions } from './stack-slot-options';
import type { iStackSlotOptionsProps } from './stack-slot-options';

interface iStackSlotProps extends iStackSlotOptionsProps {
  /** Where the options open from the slot. */
  side: 'right' | 'bottom' | 'top';
  className?: string;
  label: string;
  children: ReactNode;
}

/** A place on one end of a stack; it opens what could go there. */
export function StackSlot({ side, className, label, children, ...options }: iStackSlotProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger aria-label={label} data-open={isOpen ? '' : undefined} className={cn('group/slot', className)}>
        {children}
      </PopoverTrigger>
      <PopoverContent side={side} align={side === 'right' ? 'start' : 'center'}>
        {isOpen ? <StackSlotOptions {...options} /> : null}
      </PopoverContent>
    </Popover>
  );
}

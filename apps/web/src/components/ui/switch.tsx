import type { ComponentProps } from 'react';

import { cn } from '@~/lib/utils';

interface iSwitchProps extends Omit<ComponentProps<'button'>, 'onChange' | 'role'> {
  isOn: boolean;
  onChange: (isOn: boolean) => void;
}

/** An on/off control for a setting that applies at once. */
export function Switch({ isOn, onChange, className, ...props }: iSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={() => onChange(!isOn)}
      className={cn(
        'relative inline-flex h-5 w-9 flex-none items-center rounded-full border transition-colors disabled:opacity-50',
        isOn ? 'border-accent bg-accent' : 'border-line-strong bg-raised',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute size-3.5 rounded-full bg-surface shadow-modal transition-[left]',
          isOn ? 'left-[18px]' : 'left-[2px]',
        )}
      />
    </button>
  );
}

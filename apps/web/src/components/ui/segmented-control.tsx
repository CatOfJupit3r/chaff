import type { ReactNode } from 'react';

import { cn } from '@~/lib/utils';

interface iSegmentedOption<TValue extends string> {
  value: TValue;
  label: ReactNode;
}

interface iSegmentedControlProps<TValue extends string> {
  /** Accessible name of the group. */
  label: string;
  options: readonly iSegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  className?: string;
}

export function SegmentedControl<TValue extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: iSegmentedControlProps<TValue>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex flex-wrap gap-0.5 self-start rounded-md border border-line bg-surface p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="inline-flex h-[26px] items-center gap-1.5 rounded-sm px-2.5 text-[12.5px] text-muted hover:text-fg aria-pressed:bg-raised aria-pressed:text-fg aria-pressed:inset-ring aria-pressed:inset-ring-line-strong"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

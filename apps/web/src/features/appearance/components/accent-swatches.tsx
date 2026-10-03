import type { Accent } from '@chaff/common/enums/appearance.enums';

import { cn } from '@~/lib/utils';

import { ACCENT_OPTIONS } from '../appearance.constants';

interface iAccentSwatchesProps {
  value: Accent;
  onChange: (accent: Accent) => void;
}

export function AccentSwatches({ value, onChange }: iAccentSwatchesProps) {
  return (
    <div role="group" aria-label="Accent" className="flex flex-wrap gap-1.5">
      {ACCENT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="inline-flex h-[30px] items-center gap-[7px] rounded-sm border border-line pr-2.5 pl-2 text-[12.5px] text-muted hover:text-fg aria-pressed:border-fg aria-pressed:text-fg"
        >
          <i className={cn('size-3 rounded-full', option.swatchClassName)} />
          {option.label}
        </button>
      ))}
    </div>
  );
}

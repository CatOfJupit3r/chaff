import { cn } from '@~/lib/utils';

const WIDTHS = ['w-[40%]', 'w-[77%]', 'w-[64%]', 'w-[51%]', 'w-[88%]', 'w-[45%]'];

/** Shimmering placeholder lines shown while a diff loads. */
export function DiffSkeleton({ lineCount = 6 }: { lineCount?: number }) {
  return (
    <div aria-label="Loading" className="flex flex-col gap-[9px] pt-3.5 pr-4 pb-[18px] pl-[66px]">
      {WIDTHS.slice(0, Math.max(1, Math.min(lineCount, WIDTHS.length))).map((width) => (
        <i key={width} className={cn('block h-2.5 animate-pulse rounded-[4px] bg-raised', width)} />
      ))}
    </div>
  );
}

import { cn } from '@~/lib/utils';

interface iDiffStatProps {
  additions: number;
  deletions: number;
  className?: string;
}

export function DiffStat({ additions, deletions, className }: iDiffStatProps) {
  return (
    <span className={cn('font-mono text-[12px] whitespace-nowrap tabular-nums', className)}>
      <span className="text-good">+{additions}</span>{' '}
      <span className="text-bad">
        {'\u2212'}
        {deletions}
      </span>
    </span>
  );
}

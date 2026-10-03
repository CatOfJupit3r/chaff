import { GuideProgressRing } from './guide-progress';

interface iGuidePillProps {
  doneCount: number;
  totalCount: number;
  onExpand: () => void;
}

/** The checklist folded to its progress. */
export function GuidePill({ doneCount, totalCount, onExpand }: iGuidePillProps) {
  return (
    <button
      type="button"
      aria-expanded="false"
      aria-label={`Getting started, ${doneCount} of ${totalCount} done`}
      onClick={onExpand}
      className="pointer-events-auto inline-flex h-8 items-center gap-2 rounded-full border border-line-strong bg-surface pr-3.5 pl-2.5 text-[12.5px] font-medium text-fg shadow-dock hover:bg-hover"
    >
      <GuideProgressRing doneCount={doneCount} totalCount={totalCount} />
      Getting started
      <span className="font-mono text-[11.5px] font-normal text-muted tabular-nums">
        {doneCount} of {totalCount}
      </span>
    </button>
  );
}

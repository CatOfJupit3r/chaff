interface iGuideProgressProps {
  doneCount: number;
  totalCount: number;
}

function ratio(doneCount: number, totalCount: number) {
  return totalCount > 0 ? doneCount / totalCount : 0;
}

/** Hairline under the checklist header, filled as items are done. */
export function GuideProgressBar({ doneCount, totalCount }: iGuideProgressProps) {
  return (
    <div aria-hidden="true" className="h-0.5 flex-none bg-line">
      <div
        className="h-full bg-accent transition-[width] duration-300"
        style={{ width: `${Math.round(ratio(doneCount, totalCount) * 100)}%` }}
      />
    </div>
  );
}

const RING_RADIUS = 6;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Small ring for the folded checklist. */
export function GuideProgressRing({ doneCount, totalCount }: iGuideProgressProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 flex-none -rotate-90">
      <circle cx="8" cy="8" r={RING_RADIUS} fill="none" strokeWidth="2" className="stroke-line-strong" />
      <circle
        cx="8"
        cy="8"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={RING_LENGTH}
        strokeDashoffset={RING_LENGTH * (1 - ratio(doneCount, totalCount))}
        className="stroke-accent transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}

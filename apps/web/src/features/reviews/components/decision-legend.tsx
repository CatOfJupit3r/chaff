const LEGEND = [
  { label: 'Looks good', className: 'bg-good' },
  { label: 'Concern', className: 'bg-warn' },
  { label: 'Question', className: 'bg-accent' },
  { label: 'Not reviewed', className: 'bg-line-strong' },
] satisfies { label: string; className: string }[];

/** What the bars beside changed lines mean. */
export function DecisionLegend() {
  return (
    <div className="hidden items-center gap-3 text-[12px] text-muted 2xl:flex">
      {LEGEND.map(({ label, className }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-3 w-[3px] rounded-full ${className}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

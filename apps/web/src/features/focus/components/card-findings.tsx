import type { iFinding } from '@~/features/findings/findings.types';

/** The findings already written on what the card shows. */
export function CardFindings({ findings }: { findings: readonly iFinding[] }) {
  return findings.map((finding) => (
    <div
      key={finding.id}
      className="flex items-baseline gap-2.5 border-t border-line bg-canvas px-[22px] py-[9px] text-[12.5px]"
    >
      <span className="font-mono text-muted">F-{finding.number}</span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap text-fg-soft">{finding.body}</span>
    </div>
  ));
}

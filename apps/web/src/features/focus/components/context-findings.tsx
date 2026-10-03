import { SectionLabel } from '@~/components/ui/section-label';
import { SeverityPill } from '@~/features/findings/components/finding-badges';
import type { iFinding } from '@~/features/findings/findings.types';

interface iContextFindingsProps {
  title: string;
  findings: readonly iFinding[];
  /** Shown when there are none; the section is left out when this is not given. */
  empty?: string;
  shouldShowBranch?: boolean;
}

/** A titled list of findings in the context panel, each with its number, severity and comment. */
export function ContextFindings({ title, findings, empty, shouldShowBranch = false }: iContextFindingsProps) {
  if (findings.length === 0 && empty === undefined) return null;
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>{title}</SectionLabel>
      {findings.length === 0 ? <p className="m-0 text-[12.5px] text-muted">{empty}</p> : null}
      {findings.map((finding) => (
        <div key={finding.id} className="rounded-md border border-line px-3 py-2 text-[12.5px]">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-muted">F-{finding.number}</span>
            <SeverityPill finding={finding} />
            {shouldShowBranch ? (
              <span className="ml-auto truncate font-mono text-[11.5px] text-faint">{finding.branch}</span>
            ) : null}
          </span>
          <p className="m-0 mt-1 whitespace-pre-wrap text-fg-soft">{finding.body}</p>
        </div>
      ))}
    </section>
  );
}

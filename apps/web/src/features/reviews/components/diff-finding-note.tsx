import { Link } from '@tanstack/react-router';

import { FindingBadges } from '@~/features/findings/components/finding-badges';
import type { iFinding } from '@~/features/findings/findings.types';
import { formatRelativeTime } from '@~/utils/relative-time';

/** A saved finding under the line it points at. */
export function DiffFindingNote({ finding }: { finding: iFinding }) {
  return (
    <div className="mx-4 my-2 max-w-[640px] rounded-md border border-line-strong bg-surface font-sans shadow-modal">
      <div className="flex flex-wrap items-center gap-2 px-3.5 pt-2.5 text-[12.5px] text-muted">
        <FindingBadges finding={finding} />
        <span className="text-faint">· {formatRelativeTime(finding.createdAt)}</span>
        <Link
          to="/findings"
          search={{ finding: finding.id }}
          className="ml-auto rounded-sm px-1.5 py-0.5 text-[12px] text-muted hover:bg-hover hover:text-fg"
        >
          Open in Findings
        </Link>
      </div>
      <p className="m-0 px-3.5 pt-1.5 pb-3 text-[13.5px] leading-normal whitespace-pre-wrap text-fg">{finding.body}</p>
    </div>
  );
}

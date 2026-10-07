import { Link } from '@tanstack/react-router';

import { FINDING_KIND_LABELS } from '@chaff/common/enums/review.enums';

import { FindingBadges } from '@~/features/findings/components/finding-badges';
import type { iFinding } from '@~/features/findings/findings.types';
import { findingTitle } from '@~/features/findings/findings.utils';
import { cn } from '@~/lib/utils';
import { formatRelativeTime } from '@~/utils/relative-time';

import { primaryNoteLabel } from '../finding-placements.utils';
import type { iFindingPlacement } from '../line-notes.context';

const OPEN_IN_FINDINGS_CLASS = 'rounded-sm px-1.5 py-0.5 text-[12px] text-muted hover:bg-hover hover:text-fg';

/** A saved finding under the line it points at. */
export function DiffFindingNote({ finding }: { finding: iFinding }) {
  return (
    <div className="mx-4 my-2 max-w-[640px] rounded-md border border-line-strong bg-surface font-sans shadow-modal">
      <div className="flex flex-wrap items-center gap-2 px-3.5 pt-2.5 text-[12.5px] text-muted">
        <FindingBadges finding={finding} />
        <span className="text-faint">· {formatRelativeTime(finding.createdAt)}</span>
        <Link to="/findings" search={{ finding: finding.id }} className={cn('ml-auto', OPEN_IN_FINDINGS_CLASS)}>
          Open in Findings
        </Link>
      </div>
      <p className="m-0 px-3.5 pt-1.5 pb-3 text-[13.5px] leading-normal whitespace-pre-wrap text-fg">{finding.body}</p>
    </div>
  );
}

/** One line under another unit the finding covers, pointing at where its whole note shows. */
export function DiffFindingPointer({ placement, fileId }: { placement: iFindingPlacement; fileId: string }) {
  const { finding, primary } = placement;
  return (
    <div className="mx-4 my-1 flex max-w-[640px] items-center gap-2 rounded-md border border-dashed border-line-strong bg-surface px-3 py-1 font-sans text-[12.5px] text-muted">
      <span className="flex-none font-mono">F-{finding.number}</span>
      <span className="flex-none text-fg">{FINDING_KIND_LABELS.get(finding.kind)}</span>
      <span className="min-w-[12ch] flex-1 truncate text-fg-soft">{findingTitle(finding)}</span>
      <span title={`${primary.path}:${primary.line}`} className="flex-none font-mono text-[11.5px] text-faint">
        Note at {primaryNoteLabel(primary, fileId)}
      </span>
      <Link to="/findings" search={{ finding: finding.id }} className={cn('flex-none', OPEN_IN_FINDINGS_CLASS)}>
        Open in Findings
      </Link>
    </div>
  );
}

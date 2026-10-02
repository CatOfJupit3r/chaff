import { FINDING_KIND_LABELS } from '@chaff/common/enums/review.enums';

import { cn } from '@~/lib/utils';

import { FINDING_STATUS_DOTS } from '../findings.enums';
import type { iFinding } from '../findings.types';
import { findingTitle, formatAnchorLocation } from '../findings.utils';

interface iFindingListItemProps {
  finding: iFinding;
  isSelected: boolean;
  onSelect: () => void;
}

export function FindingListItem({ finding, isSelected, onSelect }: iFindingListItemProps) {
  const [anchor] = finding.anchors;
  const otherCount = finding.anchors.length - 1;

  return (
    <button
      type="button"
      aria-current={isSelected ? 'true' : undefined}
      onClick={onSelect}
      className="grid w-full grid-cols-[10px_minmax(0,1fr)_auto] items-start gap-x-3 border-b border-l-2 border-b-line border-l-transparent px-4 py-3 text-left last:border-b-0 hover:bg-hover aria-current:border-l-fg aria-current:bg-raised"
    >
      <span aria-hidden="true" className={cn('mt-[5px] size-2 rounded-full', FINDING_STATUS_DOTS(finding.status))} />
      <span className="min-w-0">
        <span className="line-clamp-2 text-[13.5px] text-fg">{findingTitle(finding)}</span>
        <span className="mt-1 block truncate font-mono text-[11.5px] text-faint">
          {finding.branch} · {anchor ? formatAnchorLocation(anchor) : 'whole branch'}
          {otherCount > 0 ? ` +${otherCount}` : ''}
        </span>
      </span>
      <span className="rounded-full border border-line px-2 text-[11px] text-muted">
        {FINDING_KIND_LABELS(finding.kind)}
      </span>
    </button>
  );
}

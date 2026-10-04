import { useEffect, useRef } from 'react';

import { MarkdownTitle } from '@~/components/markdown/markdown-title';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import { cn } from '@~/lib/utils';

import type { useOverview } from '../hooks/use-overview';
import type { iOverviewBranch } from '../overview.types';
import { BranchStatus } from './branch-status';

interface iStackOutlineBranchProps {
  branch: iOverviewBranch;
  ordinal: number;
  isSelected: boolean;
  onSelect: ReturnType<typeof useOverview>['selectBranch'];
}

export function StackOutlineBranch({ branch, ordinal, isSelected, onSelect }: iStackOutlineBranchProps) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isSelected) button.current?.scrollIntoView({ block: 'nearest' });
  }, [isSelected]);
  return (
    <button
      ref={button}
      type="button"
      aria-current={isSelected ? 'true' : undefined}
      onClick={async () => onSelect(branch)}
      title={branch.name}
      className={cn(
        'flex min-h-11 w-full items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-left text-sm outline-offset-2',
        isSelected ? 'border-accent bg-accent-soft text-fg' : 'border-transparent text-fg-soft hover:bg-hover',
      )}
    >
      <span className="w-5 shrink-0 font-mono text-xs text-muted tabular-nums">{String(ordinal).padStart(2, '0')}</span>
      <BranchStatus branch={branch} isCompact />
      <span className="min-w-0 flex-1">
        <MarkdownTitle text={branch.title} className="block truncate" />
        {branch.change ? (
          <span className="text-xs text-muted">{changeLabel(branch.change.host, branch.change.number)}</span>
        ) : null}
      </span>
    </button>
  );
}

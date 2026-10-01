import { ListRow } from '@~/components/ui/list';
import { Pill } from '@~/components/ui/pill';
import { pluralize } from '@~/utils/pluralize';
import { formatRelativeTime } from '@~/utils/relative-time';

import type { iLocalStack } from '../workspaces.types';
import { BranchChain } from './branch-chain';

export function StackRow({ stack }: { stack: iLocalStack }) {
  const { workspace, base, branches, tip, commitCount } = stack;

  return (
    <ListRow>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 font-medium">
          <span className="truncate">{tip.name}</span>
          <Pill variant="neutral">local</Pill>
        </div>
        <div className="mt-[3px] flex flex-wrap gap-x-3.5 text-[12.5px] text-muted">
          <span>{workspace.name}</span>
          <span>
            {pluralize(branches.length, 'branch', 'branches')}
            {base ? (
              <>
                {' onto '}
                <span className="font-mono text-[12px]">{base}</span>
              </>
            ) : null}
          </span>
          <span>updated {formatRelativeTime(tip.committedAt)}</span>
        </div>
        {branches.length > 1 ? <BranchChain branches={branches} /> : null}
      </div>
      <span className="font-mono text-[12px] text-muted tabular-nums">{pluralize(commitCount, 'commit')}</span>
    </ListRow>
  );
}

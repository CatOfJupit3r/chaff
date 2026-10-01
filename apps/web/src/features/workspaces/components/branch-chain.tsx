import { Fragment } from 'react';

import { pluralize } from '@~/utils/pluralize';

import type { iBranch } from '../workspaces.types';

export function BranchChain({ branches }: { branches: readonly iBranch[] }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-y-1.5">
      {branches.map((branch, index) => (
        <Fragment key={branch.name}>
          {index > 0 ? <span aria-hidden="true" className="h-px w-3.5 bg-line-strong" /> : null}
          <span
            title={`${pluralize(branch.commitsAhead, 'commit')} · ${branch.subject}`}
            className="inline-flex items-center gap-[5px] rounded-[5px] border border-line bg-canvas px-[7px] py-0.5 font-mono text-[11.5px] text-muted last:border-line-strong last:bg-raised last:text-fg"
          >
            {branch.name}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

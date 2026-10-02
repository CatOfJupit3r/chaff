import { Fragment } from 'react';

import type { iStackLink } from '@~/features/reviews/stack-review.utils';
import { pluralize } from '@~/utils/pluralize';

interface iBranchChainProps {
  links: readonly iStackLink[];
  /** Branch the row's main action opens. */
  nextBranch?: string;
  onOpen: (link: iStackLink) => void;
}

/** The stack's branches bottom to top; each chip opens that branch's review. */
export function BranchChain({ links, nextBranch, onOpen }: iBranchChainProps) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-y-1.5">
      {links.map((link, index) => (
        <Fragment key={link.branch.name}>
          {index > 0 ? <span aria-hidden="true" className="h-px w-3.5 bg-line-strong" /> : null}
          <button
            type="button"
            disabled={!link.parentBranch}
            aria-current={link.branch.name === nextBranch ? 'true' : undefined}
            title={[
              `${pluralize(link.branch.commitsAhead, 'commit')} · ${link.branch.subject}`,
              link.branch.remote ? `only on ${link.branch.remote}` : undefined,
              link.branch.isParentMoved ? `${link.branch.parent} moved on since` : undefined,
            ]
              .filter(Boolean)
              .join('\n')}
            onClick={() => onOpen(link)}
            className="inline-flex items-center gap-[5px] rounded-[5px] border border-line bg-canvas px-[7px] py-0.5 font-mono text-[11.5px] text-muted hover:border-line-strong hover:text-fg aria-current:border-line-strong aria-current:bg-raised aria-current:text-fg data-[remote=true]:border-dashed data-[started=true]:text-fg"
            data-started={link.target?.latestSnapshot ? 'true' : undefined}
            data-remote={link.branch.remote ? 'true' : undefined}
          >
            {link.branch.name}
            {link.branch.isParentMoved ? (
              <span aria-label="parent moved" className="size-1.5 rounded-full bg-warn" />
            ) : null}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

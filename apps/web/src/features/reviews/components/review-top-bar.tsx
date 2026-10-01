import { Link } from '@tanstack/react-router';

import { TopBar } from '@~/components/layout/top-bar';

import type { iSnapshot } from '../reviews.types';
import { SnapshotChip } from './snapshot-chip';

/** Crumbs for the review: repository, the branch under review and the parent it is compared with. */
export function ReviewTopBar({ snapshot, repositoryName }: { snapshot: iSnapshot; repositoryName: string }) {
  return (
    <TopBar end={<SnapshotChip snapshot={snapshot} />}>
      <Link to="/" className="hover:text-fg">
        Reviews
      </Link>
      <span className="text-line-strong">/</span>
      <b className="font-medium text-fg">{repositoryName}</b>
      <span className="text-line-strong">/</span>
      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-sm border border-line px-2 py-1 text-fg">
        <span className="truncate font-mono text-[12.5px]">{snapshot.branch}</span>
      </span>
      <span className="truncate text-[12.5px]">
        onto <span className="font-mono">{snapshot.parentBranch}</span>
      </span>
    </TopBar>
  );
}

import { Link } from '@tanstack/react-router';

import { TopBar } from '@~/components/layout/top-bar';
import { Pill } from '@~/components/ui/pill';
import { ChangeCrumb } from '@~/features/code-hosts/components/change-crumb';
import { DigestChip } from '@~/features/digests/components/digest-chip';

import { REVIEW_TARGET_KIND_PILLS } from '../reviews.enums';
import type { iSnapshot } from '../reviews.types';
import { SnapshotChip } from './snapshot-chip';

/** Crumbs for the review: repository, the branch under review and the parent it is compared with. */
export function ReviewTopBar({ snapshot, repositoryName }: { snapshot: iSnapshot; repositoryName: string }) {
  return (
    <TopBar
      end={
        <>
          <DigestChip snapshotId={snapshot.id} />
          <SnapshotChip snapshot={snapshot} />
        </>
      }
    >
      <Link to="/" className="hover:text-fg">
        Reviews
      </Link>
      <span className="text-line-strong">/</span>
      <b className="font-medium text-fg">{repositoryName}</b>
      <span className="text-line-strong">/</span>
      {snapshot.change ? (
        <ChangeCrumb change={snapshot.change} />
      ) : (
        <Link
          to="/stack"
          search={{ workspace: snapshot.workspaceId, branch: snapshot.branch }}
          title="Open the stack"
          className="inline-flex min-w-0 items-center gap-1.5 rounded-sm border border-line px-2 py-1 text-fg hover:bg-hover"
        >
          <span className="truncate font-mono text-[12.5px]">{snapshot.branch}</span>
        </Link>
      )}
      {REVIEW_TARGET_KIND_PILLS.has(snapshot.kind) ? (
        <Pill variant="fix">{REVIEW_TARGET_KIND_PILLS.get(snapshot.kind)}</Pill>
      ) : null}
      <span className="truncate text-[12.5px]">
        onto <span className="font-mono">{snapshot.parentBranch}</span>
      </span>
    </TopBar>
  );
}

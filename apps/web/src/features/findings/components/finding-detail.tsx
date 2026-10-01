import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

import { FINDING_STATUSES, IS_ACTIVE_FINDING_STATUS } from '@chaff/common/enums/review.enums';

import { ExternalIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { useOpenInEditor } from '@~/features/reviews/hooks/use-open-in-editor';
import { DIFF_MODES } from '@~/features/reviews/reviews.enums';
import { formatRelativeTime } from '@~/utils/relative-time';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iFinding } from '../findings.types';
import { findingTitle, formatAnchorLocation } from '../findings.utils';
import { useSetFindingStatus } from '../hooks/use-set-finding-status';
import { FindingBadges } from './finding-badges';
import { FindingLifecycle } from './finding-lifecycle';
import { FindingQuote } from './finding-quote';

const LINK_CLASS =
  'inline-flex h-[30px] items-center gap-2 rounded-sm border border-line-strong bg-surface px-3 text-[12.5px] text-fg hover:bg-hover';

interface iFindingDetailProps {
  finding: iFinding;
  repoPath: string;
}

/** One finding: the code it points at as it was, the comment verbatim, and where to go from here. */
export function FindingDetail({ finding, repoPath }: iFindingDetailProps) {
  const snapshot = useQuery(tanstackRPC.reviews.snapshot.queryOptions({ input: { snapshotId: finding.snapshotId } }));
  const openInEditor = useOpenInEditor(repoPath);
  const setStatus = useSetFindingStatus();
  const isActive = IS_ACTIVE_FINDING_STATUS(finding.status);
  const isWithdrawn = finding.status === FINDING_STATUSES.WITHDRAWN;
  const headSha = snapshot.data?.headSha.slice(0, 7);

  return (
    <article className="flex min-w-0 flex-col rounded-lg border border-line bg-surface">
      <header className="flex flex-col gap-2.5 border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
          <FindingBadges finding={finding} />
          <span className="ml-auto">
            <FindingLifecycle status={finding.status} />
          </span>
        </div>
        <h2 className="m-0 text-[17px] font-semibold tracking-[-0.01em] text-balance">{findingTitle(finding)}</h2>
        <p className="m-0 font-mono text-[12px] text-muted">
          {finding.branch} onto {finding.parentBranch}
        </p>
      </header>
      {finding.anchors.map((anchor) => (
        <section key={anchor.id} className="flex flex-col gap-2.5 border-b border-line px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
            <span className="font-mono text-fg">{formatAnchorLocation(anchor)}</span>
            {headSha ? <span>at {headSha}</span> : null}
            <span className="ml-auto flex gap-1.5">
              {anchor.unitId ? (
                <Link
                  to="/reviews/$snapshotId"
                  params={{ snapshotId: anchor.snapshotId }}
                  search={{ unit: anchor.unitId }}
                  className={LINK_CLASS}
                >
                  Open in Focus
                </Link>
              ) : null}
              <Link
                to="/reviews/$snapshotId/diff"
                params={{ snapshotId: anchor.snapshotId }}
                search={{ file: anchor.path, mode: DIFF_MODES.file }}
                className={LINK_CLASS}
              >
                Open in diff
              </Link>
              <Button variant="ghost" size="sm" onClick={() => openInEditor(anchor.path, anchor.startLine)}>
                <ExternalIcon />
                Editor
              </Button>
            </span>
          </div>
          <FindingQuote anchor={anchor} />
        </section>
      ))}
      <section className="flex flex-col gap-1.5 px-5 py-4">
        <span className="text-[12.5px] text-muted">Your note · {formatRelativeTime(finding.createdAt)}</span>
        <p className="m-0 text-[14px] leading-relaxed whitespace-pre-wrap text-fg">{finding.body}</p>
      </section>
      <footer className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3.5">
        {isActive ? (
          <Button
            disabled={setStatus.isPending}
            onClick={() =>
              setStatus.mutate({
                findingId: finding.id,
                snapshotId: finding.snapshotId,
                status: FINDING_STATUSES.WITHDRAWN,
              })
            }
          >
            Withdraw
          </Button>
        ) : null}
        {isWithdrawn ? (
          <Button
            disabled={setStatus.isPending}
            onClick={() =>
              setStatus.mutate({ findingId: finding.id, snapshotId: finding.snapshotId, status: FINDING_STATUSES.OPEN })
            }
          >
            Reopen
          </Button>
        ) : null}
        <span className="ml-auto text-[12.5px] text-faint">
          Nothing counts as resolved until you verify it after the next push.
        </span>
      </footer>
    </article>
  );
}

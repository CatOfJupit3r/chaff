import { Link } from '@tanstack/react-router';

import { ARCHIVE_REASON_LABELS } from '@chaff/common/enums/review.enums';

import { buttonVariants } from '@~/components/ui/button-variants';
import { ListRow } from '@~/components/ui/list';
import { Pill } from '@~/components/ui/pill';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import { isReviewComplete } from '@~/features/reviews/review-progress.utils';
import { pluralize } from '@~/utils/pluralize';
import { formatRelativeTime } from '@~/utils/relative-time';

import { HISTORY_KIND_LABELS } from '../history.enums';
import type { iReviewHistoryEntry } from '../history.types';

function findingsLabel({ findingCount, activeFindingCount }: iReviewHistoryEntry) {
  if (findingCount === 0) return 'no findings';
  return `${pluralize(findingCount, 'finding')}, ${activeFindingCount} active`;
}

/** One review: what it was of, how far it got, its findings, and why it is archived if it is. */
export function HistoryRow({ entry }: { entry: iReviewHistoryEntry }) {
  const { change, latestSnapshot: snapshot, archived } = entry;
  const kindLabel = HISTORY_KIND_LABELS(entry.kind);

  return (
    <ListRow>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 font-medium">
          {change ? (
            <span className="truncate">
              <span className="font-mono text-[13px] text-muted">{changeLabel(change.host, change.number)}</span>{' '}
              {change.title}
            </span>
          ) : (
            <span className="font-mono text-[13px] break-all">{entry.branch}</span>
          )}
          {kindLabel ? <Pill variant="neutral">{kindLabel}</Pill> : null}
          {archived ? (
            <Pill variant="out" title={`Archived ${formatRelativeTime(archived.at)}`}>
              {ARCHIVE_REASON_LABELS(archived.reason)}
            </Pill>
          ) : null}
          {isReviewComplete(snapshot) ? <Pill variant="ok">complete</Pill> : null}
        </div>
        <div className="mt-[3px] flex flex-wrap gap-x-3.5 text-[12.5px] text-muted">
          <span>{entry.workspaceName}</span>
          <span>
            {change ? `${entry.branch} ` : ''}onto <span className="font-mono text-[12px]">{entry.parentBranch}</span>
          </span>
          <span className="font-mono text-[12px]">
            v{snapshot.version} · {snapshot.headSha.slice(0, 7)}
          </span>
          <span title="Regions decided on or skipped">
            {snapshot.accountedRegionCount}/{snapshot.regionCount} regions
          </span>
          <span>{findingsLabel(entry)}</span>
          <span>active {formatRelativeTime(entry.lastActivityAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/reviews/$snapshotId/export"
          params={{ snapshotId: snapshot.id }}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          Export
        </Link>
        <Link
          to="/reviews/$snapshotId"
          params={{ snapshotId: snapshot.id }}
          className={buttonVariants({ variant: 'default', size: 'sm' })}
        >
          Open
        </Link>
      </div>
    </ListRow>
  );
}

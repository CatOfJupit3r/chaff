import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { Button } from '@~/components/ui/button';
import { ListRow } from '@~/components/ui/list';
import { Pill } from '@~/components/ui/pill';
import type { iReviewTarget } from '@~/features/reviews/reviews.types';
import { pluralize } from '@~/utils/pluralize';
import { formatRelativeTime } from '@~/utils/relative-time';

import type { iInboxProject, iRemoteChange } from '../code-hosts.types';
import { changeLabel } from '../code-hosts.utils';
import { useChangeActions } from '../hooks/use-change-actions';

interface iChangeRowProps {
  project: iInboxProject;
  change: iRemoteChange;
  /** The change this one is stacked on, when it is in the list too. */
  below?: iRemoteChange;
  targets: readonly iReviewTarget[];
}

/** One merge request: its title, branches and author, its review progress, and the way into it. */
export function ChangeRow({ project, change, below, targets }: iChangeRowProps) {
  const { start, link } = useChangeActions();
  const own = targets.find(
    (target) => target.workspaceId === project.workspaceId && target.change?.number === change.number,
  );
  const local = own
    ? undefined
    : targets.find(
        (target) =>
          target.workspaceId === project.workspaceId &&
          target.kind === REVIEW_TARGET_KINDS.BRANCH &&
          target.branch === change.sourceBranch &&
          target.latestSnapshot,
      );
  const snapshot = own?.latestSnapshot;

  return (
    <ListRow className={below ? 'pl-9' : undefined}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 font-medium">
          <span className="font-mono text-[12.5px] text-muted">{changeLabel(project.host, change.number)}</span>
          <span className="truncate">{change.title}</span>
          {change.isDraft ? <Pill variant="out">draft</Pill> : null}
          {own && own.activeFindingCount > 0 ? (
            <Pill variant="open">{pluralize(own.activeFindingCount, 'open finding')}</Pill>
          ) : null}
          {below ? <Pill variant="neutral">on {changeLabel(project.host, below.number)}</Pill> : null}
        </div>
        <div className="mt-[3px] flex flex-wrap gap-x-3.5 text-[12.5px] text-muted">
          <span className="font-mono text-[12px]">
            {change.sourceBranch} → {change.targetBranch}
          </span>
          <span>{change.authorName}</span>
          <span>updated {formatRelativeTime(change.updatedAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {snapshot ? (
          <span className="font-mono text-[12px] text-muted tabular-nums" title="Regions decided on or skipped">
            {snapshot.accountedRegionCount} / {snapshot.regionCount}
          </span>
        ) : null}
        {local ? (
          <Button
            size="sm"
            disabled={link.isPending}
            title="Move your local review of this branch onto the merge request"
            onClick={() => link.mutate({ targetId: local.id, number: change.number })}
          >
            Link local review
          </Button>
        ) : null}
        <Button
          variant={snapshot ? 'primary' : 'default'}
          disabled={start.isPending}
          onClick={() => start.mutate({ workspaceId: project.workspaceId, number: change.number })}
        >
          {snapshot ? 'Continue' : 'Start'}
        </Button>
      </div>
    </ListRow>
  );
}

import { Link } from '@tanstack/react-router';

import { CHANGE_REQUEST_NOUNS } from '@chaff/common/enums/code-host.enums';
import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { ExternalIcon } from '@~/components/icons/icons';
import { MarkdownBody } from '@~/components/markdown/markdown-body';
import { MarkdownTitle } from '@~/components/markdown/markdown-title';
import { Button } from '@~/components/ui/button';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import { useOpenLink } from '@~/features/code-hosts/hooks/use-open-link';
import { pluralize } from '@~/utils/pluralize';

import { useOverviewActions } from '../hooks/use-overview-actions';
import type { iStackNavigation } from '../overview.types';
import { OverviewDiscussions } from './overview-discussions';

export function BranchDetail({ stack, branch }: Pick<iStackNavigation, 'stack' | 'branch'>) {
  const actions = useOverviewActions(stack, branch);
  const openLink = useOpenLink();
  const snapshot = branch.target?.latestSnapshot;
  let percentage = 0;
  if (snapshot)
    percentage =
      snapshot.regionCount === 0
        ? 100
        : Math.min(100, Math.round((snapshot.accountedRegionCount / snapshot.regionCount) * 100));
  const reviewLabel = snapshot ? 'Continue review' : 'Start review';
  const isHostedReview = !!branch.target?.change;
  return (
    <>
      <section
        aria-label="Selected branch"
        className="grid min-w-0 gap-8 px-5 py-7 lg:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(230px,0.8fr)]"
      >
        <div className="min-w-0">
          <h2 className="m-0 text-2xl font-semibold tracking-tight wrap-anywhere">
            <MarkdownTitle text={branch.title} />
          </h2>
          <p className="mt-2 font-mono text-sm wrap-anywhere text-muted">{branch.name}</p>
          <dl className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-4 text-sm">
            <dt className="text-muted capitalize">
              {branch.change ? CHANGE_REQUEST_NOUNS.get(branch.change.host) : 'Source'}
            </dt>
            <dd className="m-0 min-w-0">
              {branch.change ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 text-accent"
                  onClick={() => (branch.change ? openLink(branch.change.webUrl) : undefined)}
                >
                  {changeLabel(branch.change.host, branch.change.number)} <ExternalIcon className="size-3" />
                </Button>
              ) : (
                'Local branch'
              )}
            </dd>
            <dt className="text-muted">Compared against</dt>
            <dd className="m-0 font-mono text-xs wrap-anywhere">
              {branch.target?.parentBranch ?? branch.parent ?? 'Choose a parent in Stack'}
            </dd>
          </dl>
          {branch.remote?.isDraft ? <p className="text-sm text-muted">Draft merge request</p> : null}
          {branch.local?.hasWorkingChanges ? (
            <p className="text-sm text-warn">This branch has uncommitted changes.</p>
          ) : null}
          {branch.local?.isParentMoved ? (
            <p className="text-sm text-warn">The parent branch has moved since this branch was based on it.</p>
          ) : null}
          {branch.local ? (
            <Link
              to="/stack"
              search={{ workspace: stack.workspace.id, branch: branch.name }}
              className="mt-4 inline-block text-sm text-accent hover:underline"
            >
              Open stack tools
            </Link>
          ) : null}
        </div>
        <div className="min-w-0 xl:border-l xl:border-line xl:pl-8">
          <h3 className="m-0 text-base font-semibold">Review progress</h3>
          {snapshot ? (
            <>
              <div className="mt-5 flex justify-between gap-3 text-sm">
                <span>
                  {snapshot.accountedRegionCount} of {snapshot.regionCount} regions covered
                </span>
                <span className="text-muted tabular-nums">{percentage}%</span>
              </div>
              <progress
                aria-label="Regions covered"
                value={percentage}
                max={100}
                className="mt-2 h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-good [&::-webkit-progress-bar]:bg-raised [&::-webkit-progress-value]:bg-good"
              />
            </>
          ) : (
            <p className="mt-5 text-sm text-muted">No review started yet.</p>
          )}
          {branch.target?.activeFindingCount ? (
            <Link to="/findings" className="mt-3 block text-sm text-warn hover:underline">
              {pluralize(branch.target.activeFindingCount, 'open finding')}
            </Link>
          ) : null}
          <Button
            variant="primary"
            className="mt-6 h-11 w-full justify-center border-accent bg-accent text-on-accent hover:border-accent hover:bg-accent hover:opacity-90"
            disabled={!actions.canOpen || actions.isPending}
            onClick={actions.openReview}
          >
            {actions.isPending ? 'Opening...' : reviewLabel}
          </Button>
          {actions.canLinkReview ? (
            <div className="mt-4 text-sm text-muted">
              <p>Your progress belongs to the local branch review.</p>
              <Button size="sm" onClick={actions.linkReview} disabled={actions.isPending}>
                Link local review to{' '}
                {branch.change ? changeLabel(branch.change.host, branch.change.number) : 'merge request'}
              </Button>
            </div>
          ) : null}
          {branch.localTarget?.latestSnapshot && branch.target?.kind !== REVIEW_TARGET_KINDS.BRANCH ? (
            <Link
              to="/reviews/$snapshotId"
              params={{ snapshotId: branch.localTarget.latestSnapshot.id }}
              className="mt-3 block text-sm text-accent hover:underline"
            >
              Open separate local review
            </Link>
          ) : null}
        </div>
      </section>
      {branch.remote?.description ? (
        <details className="border-t border-line p-5 lg:px-8">
          <summary className="cursor-pointer text-sm font-semibold">Merge request description</summary>
          <MarkdownBody text={branch.remote.description} baseUrl={branch.remote.webUrl} className="mt-4" />
        </details>
      ) : null}
      {isHostedReview && snapshot ? <OverviewDiscussions snapshotId={snapshot.id} /> : null}
    </>
  );
}

import { useState } from 'react';

import { INBOX_FILTER_LABELS, inboxFilterValues } from '@chaff/common/enums/code-host.enums';
import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';

import { MarkdownTitle } from '@~/components/markdown/markdown-title';
import { Button } from '@~/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogHeader } from '@~/components/ui/dialog';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { SelectInput } from '@~/components/ui/text-input';
import { StartReviewBox } from '@~/features/workspaces/components/start-review-box';
import { useAddWorkspace } from '@~/features/workspaces/hooks/use-add-workspace';
import type { iWorkspace } from '@~/features/workspaces/workspaces.types';
import { pluralize } from '@~/utils/pluralize';

import { useOverview } from '../hooks/use-overview';
import { BranchDetail } from './branch-detail';
import { OverviewNotices } from './overview-notices';
import { StackNeighborhood } from './stack-neighborhood';
import { StackOutline } from './stack-outline';

const INBOX_OPTIONS = inboxFilterValues.map((value) => ({ value, label: INBOX_FILTER_LABELS.get(value) }));

export function OverviewWorkspace({ workspaces }: { workspaces: readonly iWorkspace[] }) {
  const overview = useOverview(workspaces);
  const { workspace, stack, branch, inbox } = overview;
  const [isStartOpen, setIsStartOpen] = useState(false);
  const { addFromPicker, isAdding } = useAddWorkspace();
  return (
    <main className="grid min-h-0 flex-1 grid-cols-[minmax(230px,280px)_minmax(0,1fr)] max-md:grid-cols-1 max-md:overflow-y-auto">
      <aside aria-label="Stack navigation" className="flex min-h-0 flex-col border-r border-line bg-canvas max-md:h-80">
        <div className="flex shrink-0 flex-col gap-2 px-4 pt-5 pb-4">
          <label htmlFor="overview-repository" className="text-xs text-muted">
            Repository
          </label>
          <SelectInput
            id="overview-repository"
            value={workspace?.id ?? ''}
            onChange={async (event) => overview.selectRepository(event.target.value)}
          >
            {workspaces.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectInput>
        </div>
        <StackOutline
          stackList={overview.stackList}
          stack={stack}
          branch={branch}
          selectStack={overview.selectStack}
          selectBranch={overview.selectBranch}
        />
        <div className="shrink-0 border-t border-line p-3">
          <Button
            data-onboarding={ONBOARDING_ITEMS.ADD_REPOSITORY}
            size="sm"
            className="w-full justify-center"
            disabled={isAdding}
            onClick={addFromPicker}
          >
            Add repository
          </Button>
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col max-md:overflow-visible">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-line p-5 lg:px-8">
          <div className="min-w-0 flex-1">
            <p className="m-0 mb-2 text-xs text-muted">{workspace?.name} / Overview</p>
            <h1 className="m-0 text-2xl font-semibold tracking-tight">
              <MarkdownTitle text={stack?.title ?? 'Reviews'} className="line-clamp-2 wrap-anywhere" />
            </h1>
            {stack ? (
              <p className="mt-2 mb-0 text-sm text-muted">
                {pluralize(stack.branches.length, 'branch', 'branches')} · Base{' '}
                <span className="font-mono">{stack.base ?? 'not selected'}</span>
              </p>
            ) : null}
          </div>
          <Button data-onboarding={ONBOARDING_ITEMS.START_REVIEW} onClick={() => setIsStartOpen(true)}>
            Start a review
          </Button>
          {inbox.hasConnections ? (
            <div className="flex w-full flex-wrap items-center gap-3 text-xs text-muted">
              <span>Hosted requests</span>
              <SegmentedControl
                label="Show merge requests"
                options={INBOX_OPTIONS}
                value={inbox.filter}
                onChange={inbox.setFilter}
              />
            </div>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto max-md:overflow-visible">
          <OverviewNotices overview={overview} />
          {stack && branch ? (
            <div>
              <StackNeighborhood stack={stack} branch={branch} onSelectBranch={overview.selectBranch} />
              <BranchDetail stack={stack} branch={branch} />
            </div>
          ) : null}
          {!stack && !overview.isLoading ? (
            <div className="px-8 py-16 text-center">
              <h2 className="text-lg font-medium">No branches to review</h2>
              <p className="text-sm text-muted">
                Choose another repository or hosted-request filter, or start a review from a link.
              </p>
            </div>
          ) : null}
        </div>
      </div>
      <Dialog open={isStartOpen} onOpenChange={setIsStartOpen}>
        <DialogContent className="w-[min(680px,100%)]">
          <DialogHeader title="Start a review" description="Open a merge request or a local branch." />
          <DialogBody>
            <StartReviewBox workspaces={workspaces} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </main>
  );
}

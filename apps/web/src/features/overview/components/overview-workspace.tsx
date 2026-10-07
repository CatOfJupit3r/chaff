import { useState } from 'react';

import { CODE_HOST_LABELS } from '@chaff/common/enums/code-host.enums';
import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';

import { MarkdownTitle } from '@~/components/markdown/markdown-title';
import { Button } from '@~/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogHeader } from '@~/components/ui/dialog';
import { SelectInput } from '@~/components/ui/text-input';
import { ImportStackDialog } from '@~/features/stacks/components/import-stack-dialog';
import { NewStackDialog } from '@~/features/stacks/components/new-stack-dialog';
import { StackHostChanges } from '@~/features/stacks/components/stack-host-changes';
import { useLinkedHost } from '@~/features/stacks/hooks/use-linked-host';
import { StartReviewBox } from '@~/features/workspaces/components/start-review-box';
import { useAddWorkspace } from '@~/features/workspaces/hooks/use-add-workspace';
import type { iWorkspace } from '@~/features/workspaces/workspaces.types';
import { pluralize } from '@~/utils/pluralize';

import { useOverview } from '../hooks/use-overview';
import { BranchDetail } from './branch-detail';
import { OverviewNotices } from './overview-notices';
import { StackOutline } from './stack-outline';
import { StackTrain } from './stack-train';

export function OverviewWorkspace({ workspaces }: { workspaces: readonly iWorkspace[] }) {
  const overview = useOverview(workspaces);
  const { workspace, stack, branch } = overview;
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isNewStackOpen, setIsNewStackOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { addFromPicker, isAdding } = useAddWorkspace();
  const host = useLinkedHost(workspace);
  const stackedBranches = new Set(overview.stacks.flatMap((candidate) => candidate.branches.map((item) => item.name)));
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
          onNewStack={() => setIsNewStackOpen(true)}
          onImportStack={host && workspace?.isAvailable ? () => setIsImportOpen(true) : undefined}
          importLabel={host ? `Import from ${CODE_HOST_LABELS.get(host)}` : 'Import'}
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
                {pluralize(stack.branches.length, 'branch', 'branches')} ·{' '}
                {stack.base ? (
                  <>
                    Base <span className="font-mono">{stack.base}</span>
                  </>
                ) : (
                  'Base not chosen yet'
                )}
              </p>
            ) : null}
          </div>
          <Button data-onboarding={ONBOARDING_ITEMS.START_REVIEW} onClick={() => setIsStartOpen(true)}>
            Start a review
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto max-md:overflow-visible">
          <OverviewNotices overview={overview} />
          {stack && branch ? (
            <div>
              <div className="px-5 pt-5 empty:hidden lg:px-8">
                <StackHostChanges stack={stack.stack} />
              </div>
              <StackTrain
                stack={stack}
                branch={branch}
                onSelectBranch={overview.selectBranch}
                branches={overview.branches}
                stackedBranches={stackedBranches}
              />
              <BranchDetail stack={stack} branch={branch} />
            </div>
          ) : null}
          {!stack && !overview.isLoading ? (
            <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
              <h2 className="m-0 text-lg font-medium">No stacks yet</h2>
              <p className="m-0 max-w-md text-sm text-muted">
                Start a stack from the branch you want to review, then add the branches it merges into and the ones
                built on it.
              </p>
              <div className="flex gap-2">
                <Button variant="primary" disabled={!workspace?.isAvailable} onClick={() => setIsNewStackOpen(true)}>
                  New stack
                </Button>
                {host && workspace?.isAvailable ? (
                  <Button onClick={() => setIsImportOpen(true)}>Import from {CODE_HOST_LABELS.get(host)}</Button>
                ) : null}
              </div>
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
      {workspace ? (
        <NewStackDialog
          workspace={workspace}
          branches={overview.branches}
          stackedBranches={stackedBranches}
          isOpen={isNewStackOpen}
          onOpenChange={setIsNewStackOpen}
          onCreated={overview.selectStackById}
        />
      ) : null}
      {workspace && host ? (
        <ImportStackDialog
          workspace={workspace}
          host={host}
          isOpen={isImportOpen}
          onOpenChange={setIsImportOpen}
          onImported={overview.selectStackById}
        />
      ) : null}
    </main>
  );
}

import { Screen } from '@~/components/layout/screen';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import { FixWithAgentButton } from '@~/features/fixes/components/fix-dialog';
import { FixesSection } from '@~/features/fixes/components/fixes-section';
import { ReviewTopBar } from '@~/features/reviews/components/review-top-bar';

import { useExportScreen } from '../hooks/use-export-screen';
import { ExportOptionsPanel } from './export-options';
import { ExportPreview } from './export-preview';
import { ImportReportDialog } from './import-report-dialog';

const NO_COUNTS: [] = [];

/**
 * Hands findings on: as Markdown or JSON, as a prompt for a coding agent, as draft comments on the merge
 * or pull request, or straight to an agent that edits a checkout of its own. Reports come back through Import.
 */
export function ExportScreen({ snapshotId }: { snapshotId: string }) {
  const { snapshot, workspaceId, repositoryName, options, update, toggle, statuses, packet, tab, setTab } =
    useExportScreen(snapshotId);
  const { change } = snapshot;
  const reviewName = change ? changeLabel(change.host, change.number) : snapshot.branch;

  return (
    <>
      <ReviewTopBar snapshot={snapshot} repositoryName={repositoryName} />
      <Screen>
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em]">Export</h1>
              <p className="m-0 mt-1 text-muted">
                {change
                  ? 'Hand your findings to a coding agent, or post them as draft comments you publish yourself.'
                  : 'Hand your findings to a coding agent or a colleague, then import what the agent reports back.'}
              </p>
            </div>
            <div className="flex gap-2">
              <FixWithAgentButton snapshot={snapshot} />
              <ImportReportDialog workspaceId={workspaceId} />
            </div>
          </div>
          <div className="grid grid-cols-[minmax(220px,280px)_minmax(0,1fr)] items-start gap-6">
            <ExportOptionsPanel
              options={options}
              reviewName={reviewName}
              statusCounts={packet?.statusCounts ?? NO_COUNTS}
              onUpdate={update}
              onToggle={toggle}
            />
            <ExportPreview snapshot={snapshot} packet={packet} statuses={statuses} tab={tab} onTab={setTab} />
          </div>
          <FixesSection snapshotId={snapshot.id} />
        </div>
      </Screen>
    </>
  );
}

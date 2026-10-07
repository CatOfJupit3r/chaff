import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { Screen } from '@~/components/layout/screen';
import { TopBar } from '@~/components/layout/top-bar';
import { SegmentedControl } from '@~/components/ui/segmented-control';

import { FINDING_FILTER_LABELS, FINDING_FILTERS, findingFilterValues } from '../findings.enums';
import { useFindingsScreen } from '../hooks/use-findings-screen';
import { useSetFindingStatus } from '../hooks/use-set-finding-status';
import { useVerifyKeyboard } from '../hooks/use-verify-keyboard';
import { FindingDetail } from './finding-detail';
import { FindingListItem } from './finding-list-item';
import { FindingsPager } from './findings-pager';
import { VerifyProgress } from './verify-progress';

/**
 * Everything flagged across reviews, and the place to verify it: the selected finding's code before and
 * after the newest push beside the list, moved on with buttons or keys.
 */
export function FindingsScreen() {
  const { isLoading, findings, shown, selected, counts, filter, setFilter, select, workspaceFor } = useFindingsScreen();
  const setStatus = useSetFindingStatus();
  const selectedIndex = selected ? shown.indexOf(selected) : -1;
  const move = (delta: number) => {
    const next = shown[Math.min(shown.length - 1, Math.max(0, selectedIndex + delta))];
    if (next) select(next.id);
  };
  const setSelectedStatus = (status: FindingStatus, answer?: string) => {
    if (selected) setStatus.mutate({ findingId: selected.id, status, answer });
  };
  useVerifyKeyboard({ selected, onMove: move, onSetStatus: setSelectedStatus });
  const filterOptions = findingFilterValues.map((value) => ({
    value,
    label: (
      <>
        {FINDING_FILTER_LABELS.get(value)}
        <span className="ml-1.5 text-faint">{counts.get(value) ?? 0}</span>
      </>
    ),
  }));
  const verifiedCount = counts.get(FINDING_FILTERS.verified) ?? 0;

  return (
    <>
      <TopBar>
        <b className="font-medium text-fg">Findings</b>
      </TopBar>
      <Screen>
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em]">Findings</h1>
              <p className="m-0 mt-1 text-muted">
                Everything you flagged across your reviews. Nothing counts as resolved until you verify it.
              </p>
            </div>
            <VerifyProgress findings={findings} verifiedCount={verifiedCount} />
          </div>
          <SegmentedControl label="Show findings" options={filterOptions} value={filter} onChange={setFilter} />
          {!isLoading && shown.length === 0 ? (
            <p className="m-0 rounded-lg border border-dashed border-line-strong px-6 py-10 text-center text-muted">
              {findings.length === 0
                ? 'No findings yet. Write a concern or question on a card in Focus, or on lines in Full diff.'
                : 'No findings with this status.'}
            </p>
          ) : null}
          {shown.length > 0 ? (
            <div className="grid grid-cols-[minmax(260px,380px)_minmax(0,1fr)] items-start gap-5">
              <div className="flex flex-col gap-2">
                <FindingsPager index={selectedIndex} count={shown.length} onMove={move} />
                <div className="overflow-hidden rounded-lg border border-line bg-surface">
                  {shown.map((finding) => (
                    <FindingListItem
                      key={finding.id}
                      finding={finding}
                      isSelected={finding.id === selected?.id}
                      onSelect={() => select(finding.id)}
                    />
                  ))}
                </div>
              </div>
              {selected ? (
                <FindingDetail
                  key={selected.id}
                  finding={selected}
                  repoPath={workspaceFor(selected.workspaceId)?.repoPath ?? ''}
                  isPending={setStatus.isPending}
                  onSetStatus={setSelectedStatus}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </Screen>
    </>
  );
}

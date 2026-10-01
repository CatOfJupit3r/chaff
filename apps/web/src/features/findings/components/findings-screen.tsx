import { Screen } from '@~/components/layout/screen';
import { TopBar } from '@~/components/layout/top-bar';
import { SegmentedControl } from '@~/components/ui/segmented-control';

import { FINDING_FILTER_LABELS, FINDING_FILTERS, findingFilterValues } from '../findings.enums';
import { countActive } from '../findings.utils';
import { useFindingsScreen } from '../hooks/use-findings-screen';
import { FindingDetail } from './finding-detail';
import { FindingListItem } from './finding-list-item';

/** Everything flagged across reviews, with the selected finding's code and comment beside the list. */
export function FindingsScreen() {
  const { isLoading, findings, shown, selected, counts, filter, setFilter, select, workspaceFor } = useFindingsScreen();
  const filterOptions = findingFilterValues.map((value) => ({
    value,
    label: (
      <>
        {FINDING_FILTER_LABELS(value)}
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
            <p className="m-0 text-[13px] text-muted">
              {verifiedCount} of {findings.length} verified · {countActive(findings)} still open
            </p>
          </div>
          <SegmentedControl label="Show findings" options={filterOptions} value={filter} onChange={setFilter} />
          {!isLoading && shown.length === 0 ? (
            <p className="m-0 rounded-lg border border-dashed border-line-strong px-6 py-10 text-center text-muted">
              {findings.length === 0
                ? 'No findings yet. Press C or Q on a card in Focus, or the + beside a line in Full diff.'
                : 'No findings with this status.'}
            </p>
          ) : null}
          {shown.length > 0 ? (
            <div className="grid grid-cols-[minmax(260px,380px)_minmax(0,1fr)] items-start gap-5">
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
              {selected ? (
                <FindingDetail
                  key={selected.id}
                  finding={selected}
                  repoPath={workspaceFor(selected.workspaceId)?.repoPath ?? ''}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </Screen>
    </>
  );
}

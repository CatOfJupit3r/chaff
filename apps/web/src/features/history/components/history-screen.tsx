import { parseAsStringLiteral, useQueryState } from 'nuqs';

import { Screen } from '@~/components/layout/screen';
import { TopBar } from '@~/components/layout/top-bar';
import { List } from '@~/components/ui/list';
import { SegmentedControl } from '@~/components/ui/segmented-control';

import { HISTORY_FILTER_LABELS, HISTORY_FILTERS, historyFilterValues } from '../history.enums';
import { useReviewHistory } from '../hooks/use-review-history';
import { HistoryRow } from './history-row';

const filterParser = parseAsStringLiteral(historyFilterValues).withDefault(HISTORY_FILTERS.all);

/** Every review started on this computer, with the archived ones of deleted branches and closed changes. */
export function HistoryScreen() {
  const [filter, setFilter] = useQueryState('show', filterParser.withOptions({ history: 'replace' }));
  const { data: entries = [], isPending } = useReviewHistory();
  const archived = entries.filter((entry) => entry.archived);
  const shown = filter === HISTORY_FILTERS.archived ? archived : entries;

  return (
    <>
      <TopBar>
        <b className="font-medium text-fg">History</b>
      </TopBar>
      <Screen>
        <div data-onboarding-history className="mx-auto flex max-w-[980px] flex-col gap-5">
          <div>
            <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em] text-balance">History</h1>
            <p className="m-0 mt-1 text-muted">
              Every review you started. A review whose branch was deleted, or whose merge request was merged or closed,
              is archived here with its snapshots, decisions and findings.
            </p>
          </div>
          <SegmentedControl
            label="Reviews to show"
            value={filter}
            onChange={async (value) => setFilter(value)}
            options={historyFilterValues.map((value) => ({
              value,
              label: (
                <>
                  {HISTORY_FILTER_LABELS.get(value)}
                  <span className="font-mono text-[11px] text-faint tabular-nums">
                    {value === HISTORY_FILTERS.archived ? archived.length : entries.length}
                  </span>
                </>
              ),
            }))}
          />
          {shown.length > 0 ? (
            <List>
              {shown.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </List>
          ) : (
            <List className="px-6 py-10 text-center text-[13px] text-muted">
              {isPending ? 'Reading reviews…' : null}
              {!isPending && filter === HISTORY_FILTERS.archived
                ? 'Nothing archived. Reviews land here when their branch is deleted or their merge request closes.'
                : null}
              {!isPending && filter === HISTORY_FILTERS.all ? 'No reviews yet. Start one from Reviews or Stack.' : null}
            </List>
          )}
        </div>
      </Screen>
    </>
  );
}

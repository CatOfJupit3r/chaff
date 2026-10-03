import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';

import { useWorkspaces } from '@~/features/workspaces/hooks/use-workspaces';

import { FINDING_FILTERS, findingFilterValues } from '../findings.enums';
import type { FindingFilter } from '../findings.enums';
import { countByFilter, matchesFilter } from '../findings.utils';
import { useAllFindings } from './use-findings';

const findingsScreenParsers = {
  finding: parseAsString,
  filter: parseAsStringLiteral(findingFilterValues).withDefault(FINDING_FILTERS.all),
};

/** Every finding across repositories, the status filter and the finding opened on the right, kept in the URL. */
export function useFindingsScreen() {
  const query = useAllFindings();
  const workspaces = useWorkspaces();
  const [state, setState] = useQueryStates(findingsScreenParsers, { history: 'replace' });
  const findings = query.data ?? [];
  const shown = findings.filter((finding) => matchesFilter(finding, state.filter));
  const selected = shown.find((finding) => finding.id === state.finding) ?? shown[0];

  return {
    isLoading: query.isPending,
    findings,
    shown,
    selected,
    counts: countByFilter(findings),
    filter: state.filter,
    workspaceFor: (workspaceId: string) => workspaces.find((workspace) => workspace.id === workspaceId),
    setFilter: (filter: FindingFilter) => {
      setState({ filter, finding: null }).catch(() => undefined);
    },
    select: (findingId: string) => {
      setState({ finding: findingId }).catch(() => undefined);
    },
  };
}

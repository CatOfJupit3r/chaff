import { useQuery } from '@tanstack/react-query';
import { parseAsStringLiteral, useQueryState } from 'nuqs';

import { INBOX_FILTERS, inboxFilterValues } from '@chaff/common/enums/code-host.enums';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { useConnections } from './use-connections';

const inboxFilterParser = parseAsStringLiteral(inboxFilterValues).withDefault(INBOX_FILTERS.review);

/** Open merge requests of every linked project, filtered by the choice kept in the URL. */
export function useInbox() {
  const connections = useConnections();
  const [filter, setFilter] = useQueryState('inbox', inboxFilterParser.withOptions({ history: 'replace' }));
  const query = useQuery(
    tanstackRPC.codeHosts.inbox.queryOptions({
      input: { filter },
      enabled: connections.length > 0,
      staleTime: 30_000,
    }),
  );
  return {
    hasConnections: connections.length > 0,
    projects: query.data ?? [],
    isLoading: connections.length > 0 && query.isPending,
    filter,
    setFilter,
  };
}

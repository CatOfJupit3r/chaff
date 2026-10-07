import { useQuery } from '@tanstack/react-query';

import { ANSWER_STATUSES } from '@chaff/common/enums/assistant.enums';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { WRITING_POLL_MS } from '../assistant.constants';
import type { iAssistantCard, iAssistantExchange } from '../assistant.types';

const NO_EXCHANGES: iAssistantExchange[] = [];

export function assistantThreadQueryOptions({ snapshotId, cardId }: Pick<iAssistantCard, 'snapshotId' | 'cardId'>) {
  return tanstackRPC.assistant.thread.queryOptions({
    input: { snapshotId, cardId },
    refetchInterval: (query) =>
      query.state.data?.some((exchange) => exchange.status === ANSWER_STATUSES.WRITING) ? WRITING_POLL_MS : false,
  });
}

/** The questions asked about a card, oldest first; polled while an answer is being written. */
export function useAssistantThread(card: Pick<iAssistantCard, 'snapshotId' | 'cardId'>) {
  return useQuery(assistantThreadQueryOptions(card)).data ?? NO_EXCHANGES;
}

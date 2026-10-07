import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iAssistantCard } from '../assistant.types';
import { assistantThreadQueryOptions } from './use-assistant-thread';

/** Asks about a card, stops an answer, and deletes a question; the thread is refetched after each. */
export function useAssistantActions(card: iAssistantCard) {
  const queryClient = useQueryClient();
  const onSettled = async (_data: unknown, error: Error | null) => {
    if (error) showToast(getErrorMessage(error));
    await queryClient.invalidateQueries({ queryKey: assistantThreadQueryOptions(card).queryKey });
  };

  const ask = useMutation(tanstackRPC.assistant.ask.mutationOptions({ onSettled }));
  const cancel = useMutation(tanstackRPC.assistant.cancel.mutationOptions({ onSettled }));
  const remove = useMutation(tanstackRPC.assistant.remove.mutationOptions({ onSettled }));

  return {
    ask: async (question: string) => {
      const asked = await ask.mutateAsync({ ...card, question }).catch(() => undefined);
      return asked !== undefined;
    },
    cancel: (exchangeId: string) => cancel.mutate({ exchangeId }),
    remove: (exchangeId: string) => remove.mutate({ exchangeId }),
    isAsking: ask.isPending,
  };
}

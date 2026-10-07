import { ANSWER_STATUSES } from '@chaff/common/enums/assistant.enums';

import type { iAssistantCard } from '../assistant.types';
import { useAssistantActions } from '../hooks/use-assistant-actions';
import { useAssistantThread } from '../hooks/use-assistant-thread';
import { AssistantComposer } from './assistant-composer';
import { AssistantExchange } from './assistant-exchange';

/** Questions about the card and the agent's answers, kept with the review; each answer knows the ones before. */
export function CardQuestions({ card }: { card: iAssistantCard }) {
  const thread = useAssistantThread(card);
  const actions = useAssistantActions(card);
  const isWriting = thread.some((exchange) => exchange.status === ANSWER_STATUSES.WRITING);

  return (
    <div className="flex flex-col gap-4 border-t border-line px-[22px] py-4">
      {thread.length === 0 ? (
        <p className="m-0 text-[13px] text-muted">
          Ask the agent about this card without waiting for the review to finish. It reads a checkout of the branch, and
          every answer is kept here.
        </p>
      ) : null}
      {thread.map((exchange) => (
        <AssistantExchange
          key={exchange.id}
          exchange={exchange}
          onStop={() => actions.cancel(exchange.id)}
          onDelete={() => actions.remove(exchange.id)}
        />
      ))}
      <AssistantComposer isBusy={isWriting || actions.isAsking} onAsk={actions.ask} />
    </div>
  );
}

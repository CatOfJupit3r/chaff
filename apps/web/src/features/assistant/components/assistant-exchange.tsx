import { ANSWER_STATUSES } from '@chaff/common/enums/assistant.enums';

import { CloseIcon, SparkIcon, StopIcon } from '@~/components/icons/icons';
import { MarkdownBody } from '@~/components/markdown/markdown-body';
import { Button } from '@~/components/ui/button';
import { describeDigestRunner } from '@~/features/digests/digests.utils';

import type { iAssistantExchange } from '../assistant.types';

interface iAssistantExchangeProps {
  exchange: iAssistantExchange;
  onStop: () => void;
  onDelete: () => void;
}

/** What the agent is doing, or why there is no full answer. */
function AnswerStatus({ exchange, onStop }: Pick<iAssistantExchangeProps, 'exchange' | 'onStop'>) {
  if (exchange.status === ANSWER_STATUSES.WRITING) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <span className="truncate">{exchange.answer ? 'Writing…' : (exchange.progress ?? 'Starting…')}</span>
        <Button variant="ghost" size="sm" onClick={onStop}>
          <StopIcon />
          Stop
        </Button>
      </div>
    );
  }
  if (exchange.status === ANSWER_STATUSES.FAILED) {
    return <p className="m-0 text-[12px] text-bad">No answer: {exchange.error}</p>;
  }
  if (exchange.status === ANSWER_STATUSES.CANCELLED) {
    return (
      <p className="m-0 text-[12px] text-muted">Stopped{exchange.answer ? ' before the answer was finished' : ''}.</p>
    );
  }
  return null;
}

/** One question and the agent's answer, which streams in while it is written. */
export function AssistantExchange({ exchange, onStop, onDelete }: iAssistantExchangeProps) {
  return (
    <article className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <p className="m-0 flex-1 rounded-md bg-raised px-3 py-2 text-[13px] leading-normal whitespace-pre-wrap text-fg">
          {exchange.question}
        </p>
        <Button variant="ghost" size="icon" aria-label="Delete question" title="Delete question" onClick={onDelete}>
          <CloseIcon />
        </Button>
      </div>
      <div className="flex flex-col gap-1.5 pl-1">
        <div className="inline-flex items-center gap-1.5 text-[11.5px] text-faint">
          <SparkIcon className="size-[13px]" />
          {describeDigestRunner(exchange)}, read-only
        </div>
        {exchange.answer ? <MarkdownBody text={exchange.answer} className="text-[13px]" /> : null}
        <AnswerStatus exchange={exchange} onStop={onStop} />
      </div>
    </article>
  );
}

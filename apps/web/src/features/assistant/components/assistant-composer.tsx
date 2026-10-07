import { useState } from 'react';

import { Button } from '@~/components/ui/button';
import { Kbd } from '@~/components/ui/kbd';
import { TextArea } from '@~/components/ui/text-area';

import { QUICK_QUESTIONS } from '../assistant.constants';

interface iAssistantComposerProps {
  /** An answer is still being written, so the next question waits. */
  isBusy: boolean;
  onAsk: (question: string) => Promise<boolean>;
}

/** A question about the card, typed or picked from the common ones; Enter asks. */
export function AssistantComposer({ isBusy, onAsk }: iAssistantComposerProps) {
  const [question, setQuestion] = useState('');
  const ask = async (text: string) => {
    if (!text.trim() || isBusy) return;
    if (await onAsk(text.trim())) setQuestion('');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {QUICK_QUESTIONS.map((quick) => (
          <button
            key={quick}
            type="button"
            disabled={isBusy}
            onClick={async () => ask(quick)}
            className="inline-flex h-[24px] items-center rounded-full border border-line px-2.5 text-[12px] text-fg-soft hover:border-accent-line hover:text-accent disabled:pointer-events-none disabled:opacity-50"
          >
            {quick}
          </button>
        ))}
      </div>
      <TextArea
        value={question}
        aria-label="Ask about this card"
        placeholder="Ask about this card, or ask for more explanation. Enter asks, Shift+Enter for a new line."
        className="h-[64px]"
        onChange={(event) => setQuestion(event.target.value)}
        onSubmit={async () => ask(question)}
      />
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-[11.5px] text-faint">
          {isBusy ? 'Waiting for the answer…' : "The agent reads this card's code, its diff and the digest."}
        </span>
        <Button variant="primary" size="sm" disabled={isBusy || !question.trim()} onClick={async () => ask(question)}>
          Ask <Kbd className="border-current/30 bg-transparent text-inherit">↵</Kbd>
        </Button>
      </div>
    </div>
  );
}

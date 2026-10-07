import { useState } from 'react';

import { Button } from '@~/components/ui/button';
import { Kbd } from '@~/components/ui/kbd';
import { TextArea } from '@~/components/ui/text-area';

import { canReplyAndReopen } from '../discussion.utils';
import type { iFinding } from '../findings.types';
import { useReplyToFinding } from '../hooks/use-reply-to-finding';

/** A reply to the finding's discussion; Reply and reopen also reopens it where that is allowed. */
export function ReplyBox({ finding }: { finding: Pick<iFinding, 'id' | 'kind' | 'status'> }) {
  const reply = useReplyToFinding();
  const [body, setBody] = useState('');
  const isEmpty = body.trim() === '';

  const send = (shouldReopen: boolean) => {
    if (isEmpty || reply.isPending) return;
    reply.mutate({ findingId: finding.id, body: body.trim(), shouldReopen }, { onSuccess: () => setBody('') });
  };

  return (
    <div className="flex flex-col gap-2">
      <TextArea
        aria-label="Reply"
        rows={3}
        placeholder="Reply to the agent or leave a note. Enter sends, Shift+Enter for a new line."
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onSubmit={() => send(false)}
      />
      <div className="flex flex-wrap justify-end gap-2">
        {canReplyAndReopen(finding) ? (
          <Button size="sm" disabled={isEmpty || reply.isPending} onClick={() => send(true)}>
            Reply and reopen
          </Button>
        ) : null}
        <Button variant="primary" size="sm" disabled={isEmpty || reply.isPending} onClick={() => send(false)}>
          Reply <Kbd className="border-current/30 bg-transparent text-inherit">↵</Kbd>
        </Button>
      </div>
    </div>
  );
}

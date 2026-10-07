import { FINDING_AUTHORS, FINDING_EVENT_SOURCES, FINDING_STATUS_LABELS } from '@chaff/common/enums/review.enums';

import { MarkdownBody } from '@~/components/markdown/markdown-body';
import { cn } from '@~/lib/utils';
import { formatRelativeTime } from '@~/utils/relative-time';

import type { iDiscussionEntry } from '../discussion.utils';
import { FINDING_AUTHOR_LABELS, FINDING_EVENT_SOURCE_LABELS } from '../findings.enums';
import type { iFinding } from '../findings.types';

interface iDiscussionEntryProps {
  entry: iDiscussionEntry;
  /** The finding's answer, so a note that is the answer shown above is not repeated. */
  answer?: iFinding['answer'];
}

/** One message, with who wrote it and when, or one move of the finding's status. */
export function DiscussionEntry({ entry, answer }: iDiscussionEntryProps) {
  if ('message' in entry) {
    const { author, body, createdAt } = entry.message;
    const label = FINDING_AUTHOR_LABELS.get(author);
    return (
      <div className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-2.5">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-6 items-center justify-center rounded-full text-[11.5px] font-medium',
            author === FINDING_AUTHORS.AGENT ? 'bg-accent-soft text-accent' : 'bg-raised text-fg',
          )}
        >
          {label.slice(0, 1)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[12.5px] text-muted">
            <b className="font-medium text-fg">{label}</b> · {formatRelativeTime(createdAt)}
          </span>
          <MarkdownBody text={body} className="[&_p]:my-0.5" />
        </div>
      </div>
    );
  }

  const { status, source, note, commits, createdAt } = entry.event;
  return (
    <div className="flex flex-col gap-1 pl-[34px] text-[12.5px] text-muted">
      <span>
        {FINDING_STATUS_LABELS.get(status)} by {FINDING_EVENT_SOURCE_LABELS.get(source)} ·{' '}
        {formatRelativeTime(createdAt)}
        {commits?.length ? (
          <span className="ml-1.5 font-mono">{commits.map((sha) => sha.slice(0, 7)).join(', ')}</span>
        ) : null}
      </span>
      {note && note !== answer ? <p className="m-0 leading-relaxed whitespace-pre-wrap text-fg">{note}</p> : null}
      {source === FINDING_EVENT_SOURCES.AGENT ? (
        <span className="text-faint">Reported by the agent, not verified.</span>
      ) : null}
    </div>
  );
}

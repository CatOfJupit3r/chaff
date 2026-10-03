import { ExternalIcon } from '@~/components/icons/icons';
import { Pill } from '@~/components/ui/pill';
import { cn } from '@~/lib/utils';
import { formatRelativeTime } from '@~/utils/relative-time';

import type { iDiscussion } from '../code-hosts.types';
import { useOpenLink } from '../hooks/use-open-link';

interface iDiscussionThreadProps {
  discussion: iDiscussion;
  className?: string;
}

/** A thread from the merge request, read-only: replies happen on the host. */
export function DiscussionThread({ discussion, className }: iDiscussionThreadProps) {
  const openLink = useOpenLink();
  const { webUrl } = discussion;

  return (
    <div className={cn('rounded-md border border-line bg-canvas font-sans', className)}>
      <div className="flex flex-wrap items-center gap-2 px-3.5 pt-2.5 text-[12px] text-muted">
        <Pill variant="neutral">discussion</Pill>
        {discussion.isResolved ? <Pill variant="ok">resolved</Pill> : null}
        {discussion.isOnSnapshot ? null : <span className="text-faint">on another version</span>}
        {webUrl ? (
          <button
            type="button"
            onClick={() => openLink(webUrl)}
            className="ml-auto inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-muted hover:bg-hover hover:text-fg"
          >
            Reply on the host
            <ExternalIcon className="size-3" />
          </button>
        ) : null}
      </div>
      <ol className="m-0 list-none px-3.5 pt-1 pb-2.5">
        {discussion.notes.map((note) => (
          <li key={note.id} className="border-t border-line py-2 first:border-t-0">
            <div className="text-[12px] text-muted">
              <b className="font-medium text-fg">{note.authorName}</b> · {formatRelativeTime(note.createdAt)}
            </div>
            <p className="m-0 mt-1 text-[13px] leading-normal whitespace-pre-wrap text-fg">{note.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

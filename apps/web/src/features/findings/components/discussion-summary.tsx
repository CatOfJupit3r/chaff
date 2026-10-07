import { FINDING_STATUS_LABELS } from '@chaff/common/enums/review.enums';

import { MessageIcon } from '@~/components/icons/icons';
import { pluralize } from '@~/utils/pluralize';

import { buildDiscussion } from '../discussion.utils';
import { FINDING_AUTHOR_LABELS, FINDING_EVENT_SOURCE_LABELS } from '../findings.enums';
import type { iFinding } from '../findings.types';

interface iDiscussionSummaryProps {
  finding: iFinding;
  isOpen: boolean;
  onToggle: () => void;
}

/** One line under a finding shown beside code: how many replies, the latest entry, and a toggle to the whole discussion. */
export function DiscussionSummary({ finding, isOpen, onToggle }: iDiscussionSummaryProps) {
  const latest = buildDiscussion(finding).at(-1);
  const count = finding.messages.length;

  return (
    <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-muted">
      <MessageIcon className="size-3.5 flex-none" />
      <span className="flex-none">{count > 0 ? pluralize(count, 'reply', 'replies') : 'No replies'}</span>
      {latest ? (
        <span className="min-w-0 truncate">
          ·{' '}
          {'message' in latest
            ? `${FINDING_AUTHOR_LABELS.get(latest.message.author)}: ${latest.message.body.split('\n', 1)[0]}`
            : `${FINDING_STATUS_LABELS.get(latest.event.status)} by ${FINDING_EVENT_SOURCE_LABELS.get(latest.event.source)}`}
        </span>
      ) : null}
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="ml-auto flex-none rounded-sm px-1.5 py-0.5 text-[12px] text-accent hover:bg-hover"
      >
        {isOpen ? 'Hide discussion' : 'Reply'}
      </button>
    </div>
  );
}

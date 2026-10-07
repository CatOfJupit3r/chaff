import { SectionLabel } from '@~/components/ui/section-label';
import { cn } from '@~/lib/utils';

import { buildDiscussion } from '../discussion.utils';
import type { iFinding } from '../findings.types';
import { DiscussionEntry } from './discussion-entry';
import { ReplyBox } from './reply-box';

interface iFindingDiscussionProps {
  finding: iFinding;
  className?: string;
}

/** The finding's messages and status moves as one timeline, with a box to reply. */
export function FindingDiscussion({ finding, className }: iFindingDiscussionProps) {
  const entries = buildDiscussion(finding);

  return (
    <section aria-label="Discussion" className={cn('flex flex-col gap-3', className)}>
      <SectionLabel>Discussion</SectionLabel>
      {entries.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {entries.map((entry) => (
            <li key={'message' in entry ? entry.message.id : `${entry.event.status}-${entry.createdAt.getTime()}`}>
              <DiscussionEntry entry={entry} answer={finding.answer} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="m-0 text-[12.5px] text-faint">No replies yet.</p>
      )}
      <ReplyBox finding={finding} />
    </section>
  );
}

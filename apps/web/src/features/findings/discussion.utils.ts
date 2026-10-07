import { FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import { canSetFindingStatus } from '@chaff/common/helpers/finding-transitions.helper';

import type { iFinding } from './findings.types';

type iFindingMessage = iFinding['messages'][number];
type iFindingEvent = iFinding['events'][number];

interface iMessageEntry {
  message: iFindingMessage;
  createdAt: Date;
}

interface iStatusEntry {
  event: iFindingEvent;
  createdAt: Date;
}

export type iDiscussionEntry = iMessageEntry | iStatusEntry;

/**
 * The finding's discussion as one timeline, oldest first: its messages and every status it moved to after it
 * was written. A message written with a status change comes before the change.
 */
export function buildDiscussion(finding: iFinding): iDiscussionEntry[] {
  const messages: iDiscussionEntry[] = finding.messages.map((message) => ({ message, createdAt: message.createdAt }));
  const moves: iDiscussionEntry[] = finding.events.slice(1).map((event) => ({ event, createdAt: event.createdAt }));
  return [...messages, ...moves].sort(
    (left, right) =>
      left.createdAt.getTime() - right.createdAt.getTime() || Number('event' in left) - Number('event' in right),
  );
}

/** Whether a reply can reopen the finding: it is fixed, verified, answered or closed. */
export function canReplyAndReopen(finding: Pick<iFinding, 'kind' | 'status'>) {
  return canSetFindingStatus(finding.kind, finding.status, FINDING_STATUSES.REOPENED);
}

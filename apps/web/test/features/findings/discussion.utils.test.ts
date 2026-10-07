import { describe, expect, it } from 'vitest';

import {
  FINDING_AUTHORS,
  FINDING_EVENT_SOURCES,
  FINDING_KINDS,
  FINDING_STATUSES,
} from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { buildDiscussion, canReplyAndReopen } from '@~/features/findings/discussion.utils';
import type { iFinding } from '@~/features/findings/findings.types';

import { findingFixture } from './finding-fixtures';

const at = (seconds: number) => new Date(Date.UTC(2026, 9, 7, 12, 0, seconds));

function event(status: FindingStatus, seconds: number): iFinding['events'][number] {
  return { status, source: FINDING_EVENT_SOURCES.REVIEWER, snapshotId: 's', createdAt: at(seconds) };
}

function message(id: string, seconds: number): iFinding['messages'][number] {
  return { id, author: FINDING_AUTHORS.AGENT, body: id, snapshotId: 's', createdAt: at(seconds) };
}

describe('finding discussions', () => {
  it('mixes messages and status moves oldest first, leaving out the status it was written with', () => {
    const finding = findingFixture({
      events: [event(FINDING_STATUSES.OPEN, 0), event(FINDING_STATUSES.FIX_PROPOSED, 20)],
      messages: [message('later', 30), message('first', 10)],
    });

    const entries = buildDiscussion(finding).map((entry) =>
      'message' in entry ? entry.message.id : entry.event.status,
    );

    expect(entries).toEqual(['first', FINDING_STATUSES.FIX_PROPOSED, 'later']);
  });

  it('puts a reply before the reopening it was sent with', () => {
    const finding = findingFixture({
      events: [event(FINDING_STATUSES.OPEN, 0), event(FINDING_STATUSES.REOPENED, 5)],
      messages: [message('why', 5)],
    });

    expect(buildDiscussion(finding).map((entry) => 'message' in entry)).toEqual([true, false]);
  });

  it('offers to reopen only what was fixed, verified, answered or closed', () => {
    const concern = (status: FindingStatus) => canReplyAndReopen({ kind: FINDING_KINDS.CONCERN, status });
    const question = (status: FindingStatus) => canReplyAndReopen({ kind: FINDING_KINDS.QUESTION, status });

    expect([FINDING_STATUSES.FIX_PROPOSED, FINDING_STATUSES.VERIFIED].map(concern)).toEqual([true, true]);
    expect([FINDING_STATUSES.OPEN, FINDING_STATUSES.REOPENED].map(concern)).toEqual([false, false]);
    expect([FINDING_STATUSES.ANSWERED, FINDING_STATUSES.CLOSED, FINDING_STATUSES.OPEN].map(question)).toEqual([
      true,
      true,
      false,
    ]);
  });
});

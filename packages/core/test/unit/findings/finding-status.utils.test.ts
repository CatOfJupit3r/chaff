import { describe, expect, it } from 'vitest';

import { ANCHOR_MATCHES, FINDING_KINDS, FINDING_STATUSES } from '@chaff/common/enums/review.enums';

import { statusAfterRelocation } from '@~/features/findings/finding-status.utils';

const { EXACT, CHANGED, UNMATCHED } = ANCHOR_MATCHES;
const { CONCERN, QUESTION } = FINDING_KINDS;

describe('statusAfterRelocation', () => {
  it('proposes a fix when code under an open or reopened concern changed', () => {
    expect(statusAfterRelocation(CONCERN, FINDING_STATUSES.OPEN, [EXACT, CHANGED])).toBe(FINDING_STATUSES.FIX_PROPOSED);
    expect(statusAfterRelocation(CONCERN, FINDING_STATUSES.REOPENED, [CHANGED])).toBe(FINDING_STATUSES.FIX_PROPOSED);
    expect(statusAfterRelocation(CONCERN, FINDING_STATUSES.FIX_PROPOSED, [CHANGED])).toBeUndefined();
  });

  it('never moves a question because its code changed', () => {
    expect(statusAfterRelocation(QUESTION, FINDING_STATUSES.OPEN, [CHANGED])).toBeUndefined();
  });

  it('makes a finding unmatched only when every anchor is lost, and recovers it when found again', () => {
    expect(statusAfterRelocation(CONCERN, FINDING_STATUSES.OPEN, [UNMATCHED, EXACT])).toBeUndefined();
    expect(statusAfterRelocation(QUESTION, FINDING_STATUSES.ANSWERED, [UNMATCHED])).toBe(FINDING_STATUSES.UNMATCHED);
    expect(statusAfterRelocation(CONCERN, FINDING_STATUSES.UNMATCHED, [EXACT])).toBe(FINDING_STATUSES.OPEN);
    expect(statusAfterRelocation(CONCERN, FINDING_STATUSES.UNMATCHED, [CHANGED])).toBe(FINDING_STATUSES.FIX_PROPOSED);
  });

  it('leaves verified, closed and withdrawn findings alone', () => {
    for (const status of [FINDING_STATUSES.VERIFIED, FINDING_STATUSES.CLOSED, FINDING_STATUSES.WITHDRAWN]) {
      expect(statusAfterRelocation(CONCERN, status, [UNMATCHED])).toBeUndefined();
    }
  });
});

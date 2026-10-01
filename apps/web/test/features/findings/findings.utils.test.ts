import { describe, expect, it } from 'vitest';

import { DIFF_SIDES, FINDING_KINDS, FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { FINDING_FILTERS } from '@~/features/findings/findings.enums';
import type { iFinding } from '@~/features/findings/findings.types';
import { countActive, countByFilter, findingTitle, formatAnchorLocation } from '@~/features/findings/findings.utils';

function finding(status: FindingStatus, body = 'Why does this helper exist?\nIt only reads one field.'): iFinding {
  return {
    id: crypto.randomUUID(),
    number: 1,
    kind: FINDING_KINDS.CONCERN,
    status,
    body,
    workspaceId: 'w',
    targetId: 't',
    branch: 'feature',
    parentBranch: 'main',
    snapshotId: 's',
    anchors: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('findings', () => {
  it('uses the first line of the comment as the title', () => {
    expect(findingTitle(finding(FINDING_STATUSES.OPEN))).toBe('Why does this helper exist?');
  });

  it('groups statuses under the filters the screen offers', () => {
    const counts = countByFilter([
      finding(FINDING_STATUSES.OPEN),
      finding(FINDING_STATUSES.REOPENED),
      finding(FINDING_STATUSES.FIX_PROPOSED),
      finding(FINDING_STATUSES.WITHDRAWN),
      finding(FINDING_STATUSES.UNMATCHED),
    ]);
    expect(counts.get(FINDING_FILTERS.all)).toBe(5);
    expect(counts.get(FINDING_FILTERS.open)).toBe(2);
    expect(counts.get(FINDING_FILTERS['fix-proposed'])).toBe(1);
    expect(counts.get(FINDING_FILTERS.withdrawn)).toBe(1);
    expect(counts.get(FINDING_FILTERS.outdated)).toBe(1);
  });

  it('counts outdated findings as still open, withdrawn and verified ones as done', () => {
    expect(
      countActive([
        finding(FINDING_STATUSES.UNMATCHED),
        finding(FINDING_STATUSES.VERIFIED),
        finding(FINDING_STATUSES.WITHDRAWN),
      ]),
    ).toBe(1);
  });

  it('writes a location with the line range', () => {
    const anchor = {
      id: 'a',
      snapshotId: 's',
      path: 'src/a.ts',
      side: DIFF_SIDES.NEW,
      quote: '',
      contextBefore: '',
      contextAfter: '',
    };
    expect(formatAnchorLocation({ ...anchor, startLine: 3, endLine: 9 })).toBe('src/a.ts:3-9');
    expect(formatAnchorLocation({ ...anchor, startLine: 3, endLine: 3 })).toBe('src/a.ts:3');
    expect(formatAnchorLocation(anchor)).toBe('src/a.ts');
  });
});

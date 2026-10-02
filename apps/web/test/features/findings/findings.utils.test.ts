import { describe, expect, it } from 'vitest';

import { ANCHOR_MATCHES, DIFF_SIDES, FINDING_KINDS, FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { FINDING_FILTERS } from '@~/features/findings/findings.enums';
import type { iFinding, iFindingAnchor } from '@~/features/findings/findings.types';
import {
  anchorIn,
  countActive,
  countByFilter,
  countWaitingOnYou,
  findingActionLabel,
  findingTitle,
  formatAnchorLocation,
  summarizeRelocations,
} from '@~/features/findings/findings.utils';

const ANCHOR: iFindingAnchor = {
  id: 'a',
  snapshotId: 's1',
  fileId: 'file-1',
  unitId: 'unit-1',
  path: 'src/a.ts',
  side: DIFF_SIDES.NEW,
  startLine: 3,
  endLine: 5,
  quote: '',
  contextBefore: '',
  contextAfter: '',
  locations: [],
};

function location(snapshotId: string, match: iFindingAnchor['locations'][number]['match']) {
  return {
    id: `l-${snapshotId}`,
    snapshotId,
    version: 2,
    headSha: 'sha',
    match,
    fileId: 'file-2',
    unitId: 'unit-2',
    startLine: 7,
    endLine: 9,
  };
}

function finding(
  status: FindingStatus,
  body = 'Why does this helper exist?\nIt only reads one field.',
  overrides: Partial<iFinding> = {},
): iFinding {
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
    events: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
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
    const anchor = { ...ANCHOR, startLine: undefined, endLine: undefined };
    expect(formatAnchorLocation({ ...anchor, startLine: 3, endLine: 9 })).toBe('src/a.ts:3-9');
    expect(formatAnchorLocation({ ...anchor, startLine: 3, endLine: 3 })).toBe('src/a.ts:3');
    expect(formatAnchorLocation(anchor)).toBe('src/a.ts');
  });

  it('places an anchor where it was written or found again, never where it was lost', () => {
    const anchor = {
      ...ANCHOR,
      locations: [location('s2', ANCHOR_MATCHES.CHANGED), location('s3', ANCHOR_MATCHES.UNMATCHED)],
    };

    expect(anchorIn(anchor, 's1')).toEqual({ fileId: 'file-1', unitId: 'unit-1', startLine: 3, endLine: 5 });
    expect(anchorIn(anchor, 's2')).toEqual({ fileId: 'file-2', unitId: 'unit-2', startLine: 7, endLine: 9 });
    expect(anchorIn(anchor, 's3')).toBeUndefined();
  });

  it('sums up how concerns fared in a snapshot', () => {
    const withMatch = (match: iFindingAnchor['locations'][number]['match']) =>
      finding(FINDING_STATUSES.OPEN, 'x', { anchors: [{ ...ANCHOR, locations: [location('s2', match)] }] });
    const findings = [
      withMatch(ANCHOR_MATCHES.CHANGED),
      withMatch(ANCHOR_MATCHES.CHANGED),
      withMatch(ANCHOR_MATCHES.EXACT),
      withMatch(ANCHOR_MATCHES.UNMATCHED),
      finding(FINDING_STATUSES.OPEN, 'not looked for'),
    ];

    expect(summarizeRelocations(findings, 's2')).toEqual({ concerns: 4, changed: 2, unchanged: 1, unmatched: 1 });
  });

  it('counts what waits on the reviewer and names each move', () => {
    expect(
      countWaitingOnYou([
        finding(FINDING_STATUSES.FIX_PROPOSED),
        finding(FINDING_STATUSES.UNMATCHED),
        finding(FINDING_STATUSES.OPEN),
      ]),
    ).toBe(2);
    expect(findingActionLabel(FINDING_STATUSES.FIX_PROPOSED, FINDING_STATUSES.VERIFIED)).toBe('Verify fix');
    expect(findingActionLabel(FINDING_STATUSES.OPEN, FINDING_STATUSES.VERIFIED)).toBe('Resolve without a fix');
    expect(findingActionLabel(FINDING_STATUSES.FIX_PROPOSED, FINDING_STATUSES.REOPENED)).toBe('Still wrong');
    expect(findingActionLabel(FINDING_STATUSES.VERIFIED, FINDING_STATUSES.REOPENED)).toBe('Reopen');
  });
});

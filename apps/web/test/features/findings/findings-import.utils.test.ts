import { describe, expect, it } from 'vitest';

import { DIFF_SIDES, FINDING_KINDS, FINDING_SCOPES } from '@chaff/common/enums/review.enums';

import { importSummaryLine, parseFindingsFile } from '@~/features/findings/findings-import.utils';

describe('parseFindingsFile', () => {
  it('reads a findings file, anchoring on the new side and a single line unless told otherwise', () => {
    const parsed = parseFindingsFile(
      JSON.stringify({
        findings: [
          { id: 'a', kind: FINDING_KINDS.CONCERN, body: 'Why?', anchors: [{ path: 'src/a.ts', startLine: 3 }] },
        ],
      }),
    );

    expect(parsed).toEqual({
      findings: [
        {
          id: 'a',
          kind: FINDING_KINDS.CONCERN,
          body: 'Why?',
          anchors: [{ path: 'src/a.ts', side: DIFF_SIDES.NEW, startLine: 3 }],
        },
      ],
    });
  });

  it('says when the file is not JSON', () => {
    expect(parseFindingsFile('{ findings: ')).toBe('The file is not valid JSON.');
  });

  it('says which fields do not match the format', () => {
    const parsed = parseFindingsFile(
      JSON.stringify({ findings: [{ id: 'a', kind: 'BUG', body: 'Why?', anchors: [{ path: 'src/a.ts' }] }] }),
    );

    expect(parsed).toEqual(expect.stringContaining('findings[0].kind'));
    expect(parsed).toEqual(expect.stringContaining('findings[0].anchors[0].startLine'));
  });
});

describe('importSummaryLine', () => {
  const created = { id: 'a', findingId: 'f1', number: 4, scope: FINDING_SCOPES.CODE, unresolvedAnchors: [] };
  const existing = { id: 'b', findingId: 'f2', number: 2 };

  it('counts what was created and what the review already had', () => {
    expect(importSummaryLine({ created: [created], existing: [existing, existing] })).toBe(
      'Created 1 finding. Skipped 2 findings this review already has.',
    );
    expect(importSummaryLine({ created: [], existing: [existing] })).toBe(
      'No new findings. Skipped 1 finding this review already has.',
    );
  });
});

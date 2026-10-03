import { describe, expect, it } from 'vitest';

import { FINDING_KINDS, FINDING_SCOPES, FINDING_STATUSES } from '@chaff/common/enums/review.enums';

import { fixableFindings, splitPatch } from '@~/features/fixes/fixes.utils';

describe('fixableFindings', () => {
  it("keeps the review's open and reopened concerns and questions", () => {
    const findings = [
      { id: 'a', targetId: 't1', kind: FINDING_KINDS.CONCERN, status: FINDING_STATUSES.OPEN },
      { id: 'b', targetId: 't1', kind: FINDING_KINDS.QUESTION, status: FINDING_STATUSES.REOPENED },
      { id: 'c', targetId: 't1', kind: FINDING_KINDS.NOTE, status: FINDING_STATUSES.OPEN },
      { id: 'd', targetId: 't1', kind: FINDING_KINDS.CONCERN, status: FINDING_STATUSES.FIX_PROPOSED },
      { id: 'e', targetId: 't2', kind: FINDING_KINDS.CONCERN, status: FINDING_STATUSES.OPEN },
    ];

    expect(fixableFindings(findings, 't1').map((finding) => finding.id)).toEqual(['a', 'b']);
  });
});

describe('splitPatch', () => {
  it('cuts a diff into one patch per file, named by the new path', () => {
    const first = 'diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1 @@\n-x\n+y\n';
    const second = 'diff --git a/old.ts b/new.ts\nsimilarity index 90%\nrename from old.ts\nrename to new.ts\n';

    expect(splitPatch(first + second)).toEqual([
      { path: 'src/a.ts', patch: first },
      { path: 'new.ts', patch: second },
    ]);
    expect(splitPatch('')).toEqual([]);
  });
});

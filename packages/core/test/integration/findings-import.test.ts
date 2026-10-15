import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { IMPORTED_ANCHOR_PROBLEMS } from '@chaff/common/enums/findings-import.enums';
import {
  DIFF_SIDES,
  FINDING_KINDS,
  FINDING_SCOPES,
  FINDING_SEVERITIES,
  FINDING_STATUSES,
} from '@chaff/common/enums/review.enums';

import { createTestGitRepo } from '../helpers/git-repo';
import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { SCHEDULER, startFeatureReview } from '../helpers/review-repo';

const LONG_FILE = Array.from({ length: 30 }, (_, index) => `export const line${index + 1} = ${index + 1};`).join('\n');

/** main has a scheduler, a 30-line module and a readme; `feature` edits line 15 of the module and the scheduler. */
async function importReview() {
  const repo = createTestGitRepo();
  repo.commitFiles('base', {
    'src/scheduler.ts': SCHEDULER,
    'src/long.ts': `${LONG_FILE}\n`,
    'README.md': '# Project\n',
  });
  repo.branch('feature');
  repo.commitFiles('feature work', {
    'src/scheduler.ts': SCHEDULER.replace('attempt * 2', 'attempt * 3'),
    'src/long.ts': `${LONG_FILE.replace('line15 = 15', 'line15 = 1500')}\n`,
  });
  const review = await startFeatureReview(repo);
  return { ...review, headSha: repo.git('rev-parse', 'feature') };
}

describe('importing findings', () => {
  it('places anchors by path and lines on the diff and quotes the code like a written finding', async () => {
    const { snapshotId, targetId } = await importReview();

    const result = await call(appRouter.findings.importFindings, {
      snapshotId,
      file: {
        findings: [
          {
            id: 'review-1',
            kind: FINDING_KINDS.CONCERN,
            severity: FINDING_SEVERITIES.MAJOR,
            body: 'Why **3**?',
            anchors: [{ path: 'src/scheduler.ts', startLine: 3 }],
          },
          {
            id: 'review-2',
            kind: FINDING_KINDS.QUESTION,
            body: 'Was 15 wrong before?',
            anchors: [{ path: 'src/long.ts', side: DIFF_SIDES.OLD, startLine: 14, endLine: 16 }],
          },
        ],
      },
    });

    expect(result.created).toEqual([
      expect.objectContaining({ id: 'review-1', number: 1, scope: FINDING_SCOPES.CODE, unresolvedAnchors: [] }),
      expect.objectContaining({ id: 'review-2', number: 2, scope: FINDING_SCOPES.CODE, unresolvedAnchors: [] }),
    ]);
    expect(result.existing).toEqual([]);
    const findings = await call(appRouter.findings.list, { targetId });
    const [question, concern] = findings;
    expect(concern).toMatchObject({
      kind: FINDING_KINDS.CONCERN,
      severity: FINDING_SEVERITIES.MAJOR,
      status: FINDING_STATUSES.OPEN,
      body: 'Why **3**?',
      externalId: 'review-1',
    });
    expect(concern?.anchors).toEqual([
      expect.objectContaining({
        path: 'src/scheduler.ts',
        side: DIFF_SIDES.NEW,
        startLine: 3,
        endLine: 3,
        quote: '    return attempt * 3;',
        contextBefore: 'export class Scheduler {\n  next(attempt: number) {',
      }),
    ]);
    expect(question?.anchors).toEqual([
      expect.objectContaining({
        side: DIFF_SIDES.OLD,
        startLine: 14,
        endLine: 16,
        quote: 'export const line14 = 14;\nexport const line15 = 15;\nexport const line16 = 16;',
      }),
    ]);
  });

  it('leaves out anchors it cannot place, lists them, and keeps a finding without any for the whole branch', async () => {
    const { snapshotId, targetId } = await importReview();

    const result = await call(appRouter.findings.importFindings, {
      snapshotId,
      file: {
        findings: [
          {
            id: 'partly-placed',
            kind: FINDING_KINDS.CONCERN,
            body: 'Same mistake in two places',
            anchors: [
              { path: 'src/long.ts', startLine: 15 },
              { path: 'src/long.ts', startLine: 2, endLine: 4 },
            ],
          },
          {
            id: 'not-placed',
            kind: FINDING_KINDS.NOTE,
            body: 'Document this',
            anchors: [{ path: 'README.md', startLine: 1 }],
          },
        ],
      },
    });

    expect(result.created).toEqual([
      expect.objectContaining({
        id: 'partly-placed',
        scope: FINDING_SCOPES.CODE,
        unresolvedAnchors: [
          {
            path: 'src/long.ts',
            side: DIFF_SIDES.NEW,
            startLine: 2,
            endLine: 4,
            problem: IMPORTED_ANCHOR_PROBLEMS.LINES_OUTSIDE_CHANGE,
          },
        ],
      }),
      expect.objectContaining({
        id: 'not-placed',
        scope: FINDING_SCOPES.BRANCH,
        unresolvedAnchors: [
          {
            path: 'README.md',
            side: DIFF_SIDES.NEW,
            startLine: 1,
            endLine: 1,
            problem: IMPORTED_ANCHOR_PROBLEMS.FILE_NOT_IN_CHANGE,
          },
        ],
      }),
    ]);
    const [branchWide, partly] = await call(appRouter.findings.list, { targetId });
    expect(partly?.anchors.map((anchor) => [anchor.startLine, anchor.quote])).toEqual([
      [15, 'export const line15 = 1500;'],
    ]);
    expect(partly?.body).toContain('Same mistake in two places');
    expect(partly?.body).toContain('`src/long.ts` lines 2-4');
    expect(branchWide).toMatchObject({ scope: FINDING_SCOPES.BRANCH, anchors: [] });
    expect(branchWide?.body).toContain('`README.md` line 1');
  });

  it('skips findings the review already has when the same file is imported again', async () => {
    const { snapshotId, targetId } = await importReview();
    const file = {
      findings: [
        { id: 'a', kind: FINDING_KINDS.CONCERN, body: 'First', anchors: [{ path: 'src/scheduler.ts', startLine: 3 }] },
        { id: 'b', kind: FINDING_KINDS.NOTE, body: 'Second', anchors: [] },
      ],
    };
    const first = await call(appRouter.findings.importFindings, { snapshotId, file });

    const second = await call(appRouter.findings.importFindings, {
      snapshotId,
      file: { findings: [...file.findings, { id: 'c', kind: FINDING_KINDS.QUESTION, body: 'Third', anchors: [] }] },
    });

    expect(second.created.map((created) => created.id)).toEqual(['c']);
    expect(second.existing).toEqual(first.created.map(({ id, findingId, number }) => ({ id, findingId, number })));
    expect(await call(appRouter.findings.list, { targetId })).toHaveLength(3);
  });

  it('accepts the snapshot head, short or full, and refuses a file written for another commit', async () => {
    const { snapshotId, headSha, targetId } = await importReview();
    const finding = { id: 'x', kind: FINDING_KINDS.NOTE, body: 'Note', anchors: [] };

    await expectORPCError(
      call(appRouter.findings.importFindings, {
        snapshotId,
        file: { headSha: '0123456789abcdef', findings: [finding] },
      }),
      { code: errorCodes.FINDINGS_IMPORT_HEAD_MISMATCH },
    );
    const result = await call(appRouter.findings.importFindings, {
      snapshotId,
      file: { headSha: headSha.slice(0, 10).toUpperCase(), findings: [finding] },
    });

    expect(result.created).toHaveLength(1);
    expect(await call(appRouter.findings.list, { targetId })).toHaveLength(1);
  });

  it('refuses a file with a severity on a question or two findings sharing an id', async () => {
    const { snapshotId } = await importReview();

    await expect(
      call(appRouter.findings.importFindings, {
        snapshotId,
        file: {
          findings: [
            { id: 'q', kind: FINDING_KINDS.QUESTION, severity: FINDING_SEVERITIES.MINOR, body: 'Why?', anchors: [] },
          ],
        },
      }),
    ).rejects.toThrow();
    await expect(
      call(appRouter.findings.importFindings, {
        snapshotId,
        file: {
          findings: [
            { id: 'same', kind: FINDING_KINDS.NOTE, body: 'One', anchors: [] },
            { id: 'same', kind: FINDING_KINDS.NOTE, body: 'Two', anchors: [] },
          ],
        },
      }),
    ).rejects.toThrow();
  });
});

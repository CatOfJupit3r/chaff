import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { EXPORT_SCOPES, REPORT_SKIP_REASONS } from '@chaff/common/enums/export.enums';
import {
  DIFF_SIDES,
  FINDING_EVENT_SOURCES,
  FINDING_KINDS,
  FINDING_STATUSES,
  findingStatusesEnumwaii,
  UNIT_MARKS,
} from '@chaff/common/enums/review.enums';

import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { featureReview } from '../helpers/review-repo';

const EVERY_STATUS = [...findingStatusesEnumwaii.values];

async function reviewWithFindings() {
  const review = await featureReview();
  const concern = await call(appRouter.findings.create, {
    snapshotId: review.snapshotId,
    kind: FINDING_KINDS.CONCERN,
    body: 'Why 3?\nThe ticket says 2.',
    anchors: [{ unitId: review.unitTitled('Scheduler.next').id }],
  });
  const question = await call(appRouter.findings.create, {
    snapshotId: review.snapshotId,
    kind: FINDING_KINDS.QUESTION,
    body: 'Is 3 retries enough?',
    anchors: [{ fileId: review.fileAt('config.json').id, side: DIFF_SIDES.NEW, startLine: 1, endLine: 1 }],
  });
  return { ...review, concern, question };
}

describe('exports', () => {
  it('writes the findings as Markdown with the comment verbatim, its place and the quoted code', async () => {
    const { snapshotId, concern, question, repo } = await reviewWithFindings();
    const headSha = repo.git('rev-parse', 'feature').slice(0, 7);

    const packet = await call(appRouter.exports.packet, {
      snapshotId,
      scope: EXPORT_SCOPES.review,
      statuses: EVERY_STATUS,
      shouldQuoteCode: true,
      shouldListUnreviewed: false,
    });

    expect(packet).toMatchObject({ findingCount: 2, reviewCount: 1 });
    expect(packet.markdown).toContain('## feature onto main');
    expect(packet.markdown).toContain(`- [ ] **F-${concern.number} · Concern · Open**`);
    expect(packet.markdown).toContain(`\`src/scheduler.ts:2-4\` (Scheduler.next) @ ${headSha}`);
    expect(packet.markdown).toContain('  > Why 3?\n  > The ticket says 2.');
    expect(packet.markdown).toContain('  ```ts\n    next(attempt: number) {\n      return attempt * 3;\n    }\n  ```');
    expect(packet.markdown).toContain(`**F-${question.number} · Question · Open**`);
    expect(packet.agentPrompt).toContain('"status": "fix_proposed"');
    expect(packet.agentPrompt).toContain(packet.markdown);

    const json = JSON.parse(packet.json) as { reviews: { findings: { id: string; anchors: unknown[] }[] }[] };
    expect(json.reviews[0]?.findings[0]).toMatchObject({
      id: `F-${concern.number}`,
      kind: 'concern',
      status: 'open',
      comment: 'Why 3?\nThe ticket says 2.',
      anchors: [
        {
          path: 'src/scheduler.ts',
          side: 'new',
          unit: 'Scheduler.next',
          original: { startLine: 2, endLine: 4, contextBefore: 'export class Scheduler {', contextAfter: '}' },
          current: null,
        },
      ],
    });
  });

  it('exports only the chosen statuses or findings, and lists units without a decision', async () => {
    const { snapshotId, concern, question, unitTitled } = await reviewWithFindings();
    await call(appRouter.findings.setStatus, { findingId: concern.id, status: FINDING_STATUSES.WITHDRAWN });
    await call(appRouter.reviews.setMarks, {
      snapshotId,
      marks: [
        { unitId: unitTitled('Scheduler.next').id, mark: UNIT_MARKS.LOOKS_GOOD },
        { unitId: unitTitled('backoff').id, mark: UNIT_MARKS.SKIPPED, skipReason: 'tiny helper' },
      ],
    });

    const open = await call(appRouter.exports.packet, {
      snapshotId,
      scope: EXPORT_SCOPES.review,
      statuses: [FINDING_STATUSES.OPEN],
      shouldQuoteCode: false,
      shouldListUnreviewed: true,
    });
    expect(open.findingCount).toBe(1);
    expect(open.markdown).not.toContain(`F-${concern.number}`);
    expect(open.markdown).not.toContain('```');
    expect(open.markdown).toContain('### Units without a decision');
    expect(open.markdown).toContain('- `src/backoff.ts` backoff (skipped: tiny helper)');
    expect(open.markdown).not.toContain('- `src/scheduler.ts` Scheduler.next');

    const single = await call(appRouter.exports.packet, {
      snapshotId,
      scope: EXPORT_SCOPES.review,
      statuses: EVERY_STATUS,
      findingIds: [concern.id],
      shouldQuoteCode: true,
      shouldListUnreviewed: true,
    });
    expect(single.findingCount).toBe(1);
    expect(single.markdown).toContain(`- [x] **F-${concern.number} · Concern · Withdrawn**`);
    expect(single.markdown).not.toContain(`F-${question.number}`);
    expect(single.markdown).not.toContain('Units without a decision');
  });

  it('exports the findings of every review in the stack, bottom first', async () => {
    const { snapshotId, repo, workspace } = await reviewWithFindings();
    repo.branch('feature-ui');
    repo.commitFiles('ui', { 'src/ui.ts': 'export const label = "Retry";\n' });
    const upper = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'feature-ui',
      parentBranch: 'feature',
    });
    const [uiFile] = (await call(appRouter.reviews.snapshot, { snapshotId: upper.snapshotId })).files;
    await call(appRouter.findings.create, {
      snapshotId: upper.snapshotId,
      kind: FINDING_KINDS.NOTE,
      body: 'Label copy needs review',
      anchors: [{ fileId: uiFile?.id ?? '', side: DIFF_SIDES.NEW, startLine: 1, endLine: 1 }],
    });
    const options = { statuses: EVERY_STATUS, shouldQuoteCode: false, shouldListUnreviewed: false };

    const stack = await call(appRouter.exports.packet, { snapshotId, scope: EXPORT_SCOPES.stack, ...options });
    expect(stack).toMatchObject({ findingCount: 3, reviewCount: 2 });
    expect(stack.markdown.indexOf('## feature onto main')).toBeLessThan(
      stack.markdown.indexOf('## feature-ui onto feature'),
    );

    const own = await call(appRouter.exports.packet, { snapshotId, scope: EXPORT_SCOPES.review, ...options });
    expect(own.markdown).not.toContain('feature-ui');
  });

  it('posts only merge and pull request reviews', async () => {
    const { snapshotId } = await reviewWithFindings();
    await expectORPCError(call(appRouter.exports.postingPreview, { snapshotId, statuses: EVERY_STATUS }), {
      code: errorCodes.NOT_A_CHANGE_REQUEST,
    });
  });
});

describe('agent reports', () => {
  it('proposes fixes and records answers by finding id, with the agent note and commits', async () => {
    const { workspace, concern, question } = await reviewWithFindings();
    const report = [
      'Done. Here is the report:',
      '```json',
      JSON.stringify([
        { id: `F-${concern.number}`, status: 'fix_proposed', note: 'Back to 2', commits: ['abc1234'] },
        { id: question.number, status: 'answered', note: 'Yes, the receiver rate-limits anyway' },
        { id: 'F-99', status: 'fix_proposed' },
      ]),
      '```',
    ].join('\n');

    const result = await call(appRouter.findings.importReport, { workspaceId: workspace.id, report });

    expect(result).toEqual({
      applied: [
        {
          id: `F-${concern.number}`,
          findingId: concern.id,
          number: concern.number,
          status: FINDING_STATUSES.FIX_PROPOSED,
        },
        {
          id: String(question.number),
          findingId: question.id,
          number: question.number,
          status: FINDING_STATUSES.ANSWERED,
        },
      ],
      skipped: [],
      unknown: ['F-99'],
    });
    const [updatedQuestion, updatedConcern] = await call(appRouter.findings.list, { workspaceId: workspace.id });
    expect(updatedConcern?.events.at(-1)).toMatchObject({
      status: FINDING_STATUSES.FIX_PROPOSED,
      source: FINDING_EVENT_SOURCES.AGENT,
      note: 'Back to 2',
      commits: ['abc1234'],
    });
    expect(updatedQuestion).toMatchObject({
      status: FINDING_STATUSES.ANSWERED,
      answer: 'Yes, the receiver rate-limits anyway',
    });
  });

  it('leaves findings the agent may not move, and refuses text without a report', async () => {
    const { workspace, concern, question } = await reviewWithFindings();
    await call(appRouter.findings.setStatus, { findingId: concern.id, status: FINDING_STATUSES.VERIFIED });

    const result = await call(appRouter.findings.importReport, {
      workspaceId: workspace.id,
      report: JSON.stringify({
        findings: [
          { id: `F-${concern.number}`, status: 'fix_proposed' },
          { id: `F-${question.number}`, status: 'fix_proposed' },
          { id: `F-${question.number}`, status: 'answered' },
          { id: `F-${question.number}`, status: 'verified' },
        ],
      }),
    });

    expect(result.applied).toEqual([]);
    expect(result.skipped.map((item) => item.reason)).toEqual([
      REPORT_SKIP_REASONS.NOT_ACTIVE,
      REPORT_SKIP_REASONS.WRONG_KIND,
      REPORT_SKIP_REASONS.MISSING_NOTE,
      REPORT_SKIP_REASONS.UNSUPPORTED_STATUS,
    ]);
    await expectORPCError(
      call(appRouter.findings.importReport, { workspaceId: workspace.id, report: 'All fixed, trust me.' }),
      { code: errorCodes.INVALID_AGENT_REPORT },
    );
  });
});

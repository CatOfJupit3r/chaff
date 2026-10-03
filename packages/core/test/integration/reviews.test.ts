import { call } from '@orpc/server';
import { chmodSync, existsSync, readdirSync, statSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { FILE_KINDS, FILE_STATUSES } from '@chaff/common/enums/review.enums';

import { createTestGitRepo } from '../helpers/git-repo';
import type { TestGitRepo } from '../helpers/git-repo';
import { appRouter, testDataDir } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { addWorkspace, createFeatureRepo, SCHEDULER, startFeatureReview } from '../helpers/review-repo';

/** Everything git keeps about refs and the index, to prove a review left the repository alone. */
function repositoryState(repo: TestGitRepo) {
  const gitDirectory = path.join(repo.path, '.git');
  return {
    refs: repo.git('for-each-ref', '--format=%(refname) %(objectname)'),
    head: repo.git('symbolic-ref', 'HEAD'),
    indexModifiedAt: statSync(path.join(gitDirectory, 'index')).mtimeMs,
    entries: readdirSync(gitDirectory).sort(),
  };
}

describe('reviews', () => {
  it("freezes the branch's own changes against its parent, in reading order", async () => {
    const repo = createFeatureRepo();
    const { snapshotId } = await startFeatureReview(repo);

    const snapshot = await call(appRouter.reviews.snapshot, { snapshotId });

    expect(snapshot).toMatchObject({
      version: 1,
      latestVersion: 1,
      branch: 'feature',
      parentBranch: 'main',
      headSha: repo.git('rev-parse', 'feature'),
      baseSha: repo.git('rev-parse', 'main'),
      fileCount: 4,
    });
    expect(snapshot.files.map((file) => [file.path, file.status, file.kind])).toEqual([
      ['src/backoff.ts', FILE_STATUSES.ADDED, FILE_KINDS.SOURCE],
      ['src/backoff.test.ts', FILE_STATUSES.ADDED, FILE_KINDS.TEST],
      ['src/scheduler.ts', FILE_STATUSES.MODIFIED, FILE_KINDS.SOURCE],
      ['config.json', FILE_STATUSES.MODIFIED, FILE_KINDS.CONFIG],
    ]);
    expect(snapshot.files.map((file) => file.unitCount)).toEqual([1, 1, 1, 1]);
    expect(snapshot.unitCount).toBe(4);
    expect(snapshot.additions).toBe(snapshot.files.reduce((sum, file) => sum + file.additions, 0));
  });

  it('continues the same snapshot when the review is started again', async () => {
    const repo = createFeatureRepo();
    const { workspace, targetId, snapshotId } = await startFeatureReview(repo);
    repo.commitFiles('more work', { 'src/later.ts': 'export const later = 1;\n' });

    const again = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'feature',
      parentBranch: 'main',
    });

    expect(again).toEqual({ targetId, snapshotId });
    const reviews = await call(appRouter.reviews.list, { workspaceId: workspace.id });
    expect(reviews).toEqual([
      expect.objectContaining({
        id: targetId,
        branch: 'feature',
        latestSnapshot: expect.objectContaining({ id: snapshotId, version: 1, unitCount: 4 }),
      }),
    ]);
  });

  it('never writes to the repository being reviewed', async () => {
    const repo = createFeatureRepo();
    const before = repositoryState(repo);

    const { snapshotId } = await startFeatureReview(repo);
    await call(appRouter.reviews.liveStatus, { snapshotId });

    expect(repositoryState(repo)).toEqual(before);
  });

  it('serves each file patch and both versions of its contents', async () => {
    const repo = createFeatureRepo();
    const { snapshotId } = await startFeatureReview(repo);
    const { files } = await call(appRouter.reviews.snapshot, { snapshotId });
    const scheduler = files.find((file) => file.path === 'src/scheduler.ts');
    if (!scheduler) throw new Error('scheduler.ts is missing from the snapshot');

    const { patch } = await call(appRouter.reviews.fileDiff, { snapshotId, fileId: scheduler.id });
    const contents = await call(appRouter.reviews.fileContents, { snapshotId, fileId: scheduler.id });

    expect(patch).toContain('diff --git a/src/scheduler.ts b/src/scheduler.ts');
    expect(patch).toContain('-    return attempt * 2;\n+    return attempt * 3;');
    expect(contents).toEqual({
      oldContents: SCHEDULER,
      newContents: SCHEDULER.replace('attempt * 2', 'attempt * 3'),
    });
  });

  it('diffs a file again with more context, or without its whitespace-only changes', async () => {
    const lines = Array.from({ length: 30 }, (_, index) => `const line${index + 1} = ${index + 1};`);
    const repo = createTestGitRepo();
    repo.commitFiles('base', { 'src/lines.ts': `${lines.join('\n')}\n` });
    repo.branch('feature');
    const changed = lines.map((line, index) => {
      if (index === 3) return 'const line4 = 40;';
      if (index === 24) return `  ${line}`;
      return line;
    });
    repo.commitFiles('feature work', { 'src/lines.ts': `${changed.join('\n')}\n` });
    const { snapshotId } = await startFeatureReview(repo);
    const [file] = (await call(appRouter.reviews.snapshot, { snapshotId })).files;
    const fileId = file?.id ?? '';

    const frozen = await call(appRouter.reviews.fileDiff, { snapshotId, fileId });
    const wide = await call(appRouter.reviews.fileDiff, { snapshotId, fileId, contextLines: 10 });
    const quiet = await call(appRouter.reviews.fileDiff, { snapshotId, fileId, isWhitespaceIgnored: true });

    expect(frozen.patch).not.toContain(' const line15 = 15;');
    expect(wide.patch).toContain(' const line15 = 15;');
    expect(quiet.patch).toContain('+const line4 = 40;');
    expect(quiet.patch).not.toContain('+  const line25 = 25;');
    expect(frozen.patch).toContain('+  const line25 = 25;');
  });

  it('accounts for renames, deletions, binaries, mode and type changes', async () => {
    const repo = createTestGitRepo();
    repo.commitFiles('base', {
      'docs/guide.md': 'Read me first.\nSecond line.\nThird line.\n',
      'scripts/run.sh': 'echo run\n',
      'assets/logo.bin': Buffer.from([0, 1, 2, 3]),
      'src/gone.ts': 'export const gone = true;\n',
      'link-target.txt': 'target\n',
      'pointer.txt': 'plain file\n',
    });
    repo.branch('cleanup');
    repo.git('mv', 'docs/guide.md', 'docs/handbook.md');
    chmodSync(path.join(repo.path, 'scripts/run.sh'), 0o755);
    repo.git('rm', '--quiet', 'pointer.txt');
    symlinkSync('link-target.txt', path.join(repo.path, 'pointer.txt'));
    repo.commitFiles('cleanup', { 'assets/logo.bin': Buffer.from([0, 1, 2, 4]), 'src/gone.ts': null });

    const { snapshotId } = await startFeatureReview(repo, 'cleanup');
    const snapshot = await call(appRouter.reviews.snapshot, { snapshotId });
    const byPath = new Map(snapshot.files.map((file) => [file.path, file]));

    expect(byPath.get('docs/handbook.md')).toMatchObject({ status: FILE_STATUSES.RENAMED, oldPath: 'docs/guide.md' });
    expect(byPath.get('scripts/run.sh')).toMatchObject({ oldMode: '100644', newMode: '100755' });
    expect(byPath.get('assets/logo.bin')).toMatchObject({ isBinary: true, kind: FILE_KINDS.BINARY });
    expect(byPath.get('src/gone.ts')).toMatchObject({ status: FILE_STATUSES.DELETED, deletions: 1 });
    expect(byPath.get('pointer.txt')).toMatchObject({ status: FILE_STATUSES.TYPE_CHANGED });
    // Every change, even one without changed lines, is reachable through a unit and a region.
    expect(snapshot.files.every((file) => file.unitCount === 1 && file.regionCount >= 1)).toBe(true);
    expect(snapshot.regionCount).toBe(snapshot.files.reduce((sum, file) => sum + file.regionCount, 0));
  });

  it('reports new commits without changing the snapshot, and refreshes into a new version', async () => {
    const repo = createFeatureRepo();
    const { targetId, snapshotId } = await startFeatureReview(repo);
    repo.commitFiles('follow-up', { 'src/backoff.ts': 'export function backoff() {\n  return 1;\n}\n' });

    const status = await call(appRouter.reviews.liveStatus, { snapshotId });
    const frozen = await call(appRouter.reviews.snapshot, { snapshotId });
    const refreshed = await call(appRouter.reviews.refresh, { targetId });
    const unchanged = await call(appRouter.reviews.refresh, { targetId });

    expect(status).toEqual({
      isBranchMissing: false,
      newCommitCount: 1,
      isBranchRewritten: false,
      isParentMoved: false,
      isParentChanged: false,
      hasNewWorkingChanges: false,
    });
    expect(frozen.headSha).not.toBe(repo.git('rev-parse', 'feature'));
    expect(refreshed).toMatchObject({ targetId, isNew: true });
    expect(refreshed.snapshotId).not.toBe(snapshotId);
    expect(unchanged).toEqual({ ...refreshed, isNew: false });
    const latest = await call(appRouter.reviews.snapshot, { snapshotId: refreshed.snapshotId });
    expect(latest).toMatchObject({ version: 2, latestVersion: 2, headSha: repo.git('rev-parse', 'feature') });
  });

  it('keeps a snapshot readable after the branch is rewritten and its commits are pruned', async () => {
    const repo = createFeatureRepo();
    const { snapshotId } = await startFeatureReview(repo);
    const { files } = await call(appRouter.reviews.snapshot, { snapshotId });
    repo.git('commit', '--quiet', '--amend', '-m', 'rewritten');
    repo.git('reflog', 'expire', '--expire=now', '--all');
    repo.git('gc', '--quiet', '--prune=now');

    const status = await call(appRouter.reviews.liveStatus, { snapshotId });
    const contents = await call(appRouter.reviews.fileContents, { snapshotId, fileId: files[0]?.id ?? '' });

    expect(status).toMatchObject({ isBranchRewritten: true, newCommitCount: 0 });
    expect(contents.newContents).toContain('export function backoff');
  });

  it('flags a moved parent and a deleted branch', async () => {
    const repo = createFeatureRepo();
    const { snapshotId } = await startFeatureReview(repo);
    repo.switch('main');
    repo.commitFiles('main moves on', { 'README.md': 'updated\n' });

    const parentMoved = await call(appRouter.reviews.liveStatus, { snapshotId });
    repo.git('branch', '--quiet', '-D', 'feature');
    const branchGone = await call(appRouter.reviews.liveStatus, { snapshotId });

    expect(parentMoved).toMatchObject({ isParentMoved: true, isBranchMissing: false, newCommitCount: 0 });
    expect(branchGone).toMatchObject({ isBranchMissing: true });
  });

  it('refuses missing branches, a branch against itself and unrelated histories', async () => {
    const repo = createFeatureRepo();
    repo.git('switch', '--quiet', '--orphan', 'unrelated');
    repo.commitFiles('unrelated root', { 'other.txt': 'other\n' });
    const workspace = await addWorkspace(repo);
    const workspaceId = workspace.id;

    await expectORPCError(call(appRouter.reviews.start, { workspaceId, branch: 'nope', parentBranch: 'main' }), {
      code: errorCodes.BRANCH_NOT_FOUND,
    });
    await expectORPCError(call(appRouter.reviews.start, { workspaceId, branch: 'main', parentBranch: 'main' }), {
      code: errorCodes.INVALID_PARENT_BRANCH,
    });
    await expectORPCError(call(appRouter.reviews.start, { workspaceId, branch: 'unrelated', parentBranch: 'main' }), {
      code: errorCodes.NO_COMMON_ANCESTOR,
    });
    await expectORPCError(call(appRouter.reviews.snapshot, { snapshotId: 'missing' }), {
      code: errorCodes.SNAPSHOT_NOT_FOUND,
    });
  });

  it("deletes the repository's snapshot store when the repository is removed", async () => {
    const repo = createFeatureRepo();
    const { workspace } = await startFeatureReview(repo);
    const storePath = path.join(testDataDir, 'stores', `${workspace.id}.git`);
    expect(existsSync(storePath)).toBe(true);

    await call(appRouter.workspaces.remove, { workspaceId: workspace.id });

    expect(existsSync(storePath)).toBe(false);
    await expect(call(appRouter.reviews.list, { workspaceId: workspace.id })).resolves.toEqual([]);
  });
});

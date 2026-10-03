import { call } from '@orpc/server';

import { createTestGitRepo } from './git-repo';
import type { TestGitRepo } from './git-repo';
import { appRouter } from './instance';

export const SCHEDULER = `export class Scheduler {
  next(attempt: number) {
    return attempt * 2;
  }
}
`;

export async function addWorkspace(repo: TestGitRepo) {
  return call(appRouter.workspaces.add, { path: repo.path });
}

/** main has the scheduler; `feature` edits it, adds a helper with its test and bumps the config. */
export function createFeatureRepo() {
  const repo = createTestGitRepo();
  repo.commitFiles('base', { 'src/scheduler.ts': SCHEDULER, 'config.json': '{ "retries": 1 }\n' });
  repo.branch('feature');
  repo.commitFiles('feature work', {
    'src/scheduler.ts': SCHEDULER.replace('attempt * 2', 'attempt * 3'),
    'src/backoff.ts': 'export function backoff(attempt: number) {\n  return 2 ** attempt;\n}\n',
    'src/backoff.test.ts': "it('grows', () => {\n  expect(backoff(2)).toBe(4);\n});\n",
    'config.json': '{ "retries": 3 }\n',
  });
  return repo;
}

export async function startFeatureReview(repo: TestGitRepo, branch = 'feature', parentBranch = 'main') {
  const workspace = await addWorkspace(repo);
  const started = await call(appRouter.reviews.start, { workspaceId: workspace.id, branch, parentBranch });
  return { workspace, ...started };
}

/** A review of `feature` with lookups for its units by title and files by path. */
export async function featureReview(repo = createFeatureRepo()) {
  const review = await startFeatureReview(repo);
  const units = await call(appRouter.reviews.units, { snapshotId: review.snapshotId });
  const { files } = await call(appRouter.reviews.snapshot, { snapshotId: review.snapshotId });
  const unitTitled = (title: string) => {
    const unit = units.find((candidate) => candidate.title === title);
    if (!unit) throw new Error(`No unit titled ${title}`);
    return unit;
  };
  const fileAt = (path: string) => {
    const file = files.find((candidate) => candidate.path === path);
    if (!file) throw new Error(`No file ${path}`);
    return file;
  };
  return { ...review, repo, unitTitled, fileAt };
}

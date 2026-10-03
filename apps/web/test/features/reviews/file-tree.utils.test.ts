import { describe, expect, it } from 'vitest';

import { buildFileTree, filterFiles, flattenFileTree, splitPath } from '@~/features/reviews/file-tree.utils';

import { snapshotFile } from './review-fixtures';

const paths = (files: { path: string }[]) => files.map(({ path }) => path);

describe('buildFileTree', () => {
  it('lists folders before files, each sorted by name, and counts files per folder', () => {
    const tree = buildFileTree([
      snapshotFile('src/zeta.ts'),
      snapshotFile('README.md'),
      snapshotFile('src/alpha.ts'),
      snapshotFile('src/lib/util.ts'),
      snapshotFile('docs/guide.md'),
    ]);

    expect(tree.folders.map(({ name }) => name)).toEqual(['docs', 'src']);
    expect(paths(tree.files)).toEqual(['README.md']);
    expect(tree.folders[1]?.fileCount).toBe(3);
    expect(paths(flattenFileTree(tree))).toEqual([
      'docs/guide.md',
      'src/lib/util.ts',
      'src/alpha.ts',
      'src/zeta.ts',
      'README.md',
    ]);
  });

  it('merges folders that only hold one folder into a single row', () => {
    const tree = buildFileTree([
      snapshotFile('packages/core/src/features/a.ts'),
      snapshotFile('packages/core/src/features/b.ts'),
      snapshotFile('packages/core/test/a.test.ts'),
    ]);

    expect(tree.folders.map(({ name }) => name)).toEqual(['packages/core']);
    expect(tree.folders[0]?.folders.map(({ name }) => name)).toEqual(['src/features', 'test']);
    expect(tree.folders[0]?.fileCount).toBe(3);
  });

  it('sorts names with numbers in natural order', () => {
    const tree = buildFileTree([snapshotFile('step10.ts'), snapshotFile('step2.ts'), snapshotFile('Step1.ts')]);

    expect(paths(tree.files)).toEqual(['Step1.ts', 'step2.ts', 'step10.ts']);
  });
});

describe('filterFiles', () => {
  it('matches anywhere in the path, ignoring case and surrounding spaces', () => {
    const files = [snapshotFile('src/Retry/scheduler.ts'), snapshotFile('src/queue.ts')];

    expect(paths(filterFiles(files, '  retry/SCHED '))).toEqual(['src/Retry/scheduler.ts']);
    expect(filterFiles(files, '')).toHaveLength(2);
  });
});

describe('splitPath', () => {
  it('keeps the trailing slash on the folder', () => {
    expect(splitPath('src/lib/util.ts')).toEqual({ folder: 'src/lib/', name: 'util.ts' });
    expect(splitPath('README.md')).toEqual({ folder: '', name: 'README.md' });
  });
});

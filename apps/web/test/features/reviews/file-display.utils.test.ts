import { describe, expect, it } from 'vitest';

import { FILE_KINDS, FILE_STATUSES } from '@chaff/common/enums/review.enums';

import { LARGE_DIFF_LINES, getFileDisplay } from '@~/features/reviews/file-display.utils';
import { FILE_DISPLAYS } from '@~/features/reviews/reviews.enums';

import { snapshotFile } from './review-fixtures';

describe('getFileDisplay', () => {
  it('shows ordinary changes as a diff', () => {
    expect(getFileDisplay(snapshotFile('src/app.ts'))).toBe(FILE_DISPLAYS.DIFF);
  });

  it('keeps generated files and very long diffs collapsed', () => {
    expect(getFileDisplay(snapshotFile('pnpm-lock.yaml', { kind: FILE_KINDS.GENERATED }))).toBe(
      FILE_DISPLAYS.GENERATED,
    );
    expect(getFileDisplay(snapshotFile('src/big.ts', { additions: LARGE_DIFF_LINES, deletions: 1 }))).toBe(
      FILE_DISPLAYS.LARGE,
    );
  });

  it('notes changes that have no lines to show', () => {
    expect(getFileDisplay(snapshotFile('logo.png', { isBinary: true, additions: 0, deletions: 0 }))).toBe(
      FILE_DISPLAYS.BINARY,
    );
    expect(
      getFileDisplay(
        snapshotFile('src/new.ts', {
          status: FILE_STATUSES.RENAMED,
          oldPath: 'src/old.ts',
          additions: 0,
          deletions: 0,
        }),
      ),
    ).toBe(FILE_DISPLAYS.RENAME_ONLY);
    expect(getFileDisplay(snapshotFile('run.sh', { newMode: '100755', additions: 0, deletions: 0 }))).toBe(
      FILE_DISPLAYS.MODE_ONLY,
    );
    expect(
      getFileDisplay(
        snapshotFile('.keep', { status: FILE_STATUSES.ADDED, oldMode: undefined, additions: 0, deletions: 0 }),
      ),
    ).toBe(FILE_DISPLAYS.EMPTY);
  });

  it('prefers the too-large note over every other display', () => {
    expect(getFileDisplay(snapshotFile('dump.sql', { isTooLarge: true, kind: FILE_KINDS.GENERATED }))).toBe(
      FILE_DISPLAYS.TOO_LARGE,
    );
  });
});

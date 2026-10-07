import { describe, expect, it } from 'vitest';

import { FILE_PREVIEWS } from '@chaff/common/enums/file-preview.enums';
import { FILE_KINDS, FILE_STATUSES } from '@chaff/common/enums/review.enums';

import { LARGE_DIFF_LINES, getFileDisplay, getTextPreview } from '@~/features/reviews/file-display.utils';
import { formatByteSize, resolveRepoPath } from '@~/features/reviews/file-preview.utils';
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
    expect(getFileDisplay(snapshotFile('assets/data.bin', { isBinary: true, additions: 0, deletions: 0 }))).toBe(
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

  it('draws binary files whose extension names an image format', () => {
    expect(getFileDisplay(snapshotFile('assets/Logo.PNG', { isBinary: true, additions: 0, deletions: 0 }))).toBe(
      FILE_DISPLAYS.IMAGE,
    );
    expect(getFileDisplay(snapshotFile('assets/font.woff2', { isBinary: true, additions: 0, deletions: 0 }))).toBe(
      FILE_DISPLAYS.BINARY,
    );
  });
});

describe('getTextPreview', () => {
  it('offers a drawn preview for SVG, Markdown and Mermaid text files only', () => {
    expect(getTextPreview(snapshotFile('icons/check.svg'))).toBe(FILE_PREVIEWS.IMAGE);
    expect(getTextPreview(snapshotFile('README.md'))).toBe(FILE_PREVIEWS.MARKDOWN);
    expect(getTextPreview(snapshotFile('docs/flow.mmd'))).toBe(FILE_PREVIEWS.MERMAID);
    expect(getTextPreview(snapshotFile('data/users.csv'))).toBe(FILE_PREVIEWS.CSV);
    expect(getTextPreview(snapshotFile('data/users.TSV'))).toBe(FILE_PREVIEWS.TSV);
    expect(getTextPreview(snapshotFile('src/app.ts'))).toBeUndefined();
    expect(getTextPreview(snapshotFile('.md'))).toBeUndefined();
    expect(getTextPreview(snapshotFile('logo.png', { isBinary: true }))).toBeUndefined();
  });
});

describe('formatByteSize', () => {
  it('picks the largest unit that keeps the number at or above one', () => {
    expect(formatByteSize(512)).toBe('512 bytes');
    expect(formatByteSize(4_210)).toBe('4.2 kB');
    expect(formatByteSize(3_500_000)).toBe('3.5 MB');
  });
});

describe('resolveRepoPath', () => {
  it('resolves image links against the Markdown file folder or the repository root', () => {
    expect(resolveRepoPath('docs/guide.md', 'shot.png')).toBe('docs/shot.png');
    expect(resolveRepoPath('docs/guide.md', './img/My%20Shot.png?raw=1#top')).toBe('docs/img/My Shot.png');
    expect(resolveRepoPath('docs/guide.md', '../assets/logo.svg')).toBe('assets/logo.svg');
    expect(resolveRepoPath('docs/guide.md', '/assets/logo.svg')).toBe('assets/logo.svg');
  });

  it('leaves out links to other sites and paths above the repository', () => {
    expect(resolveRepoPath('README.md', 'https://example.com/a.png')).toBeUndefined();
    expect(resolveRepoPath('README.md', '//cdn.example.com/a.png')).toBeUndefined();
    expect(resolveRepoPath('README.md', 'data:image/png;base64,AAAA')).toBeUndefined();
    expect(resolveRepoPath('docs/guide.md', '../../secret.png')).toBeUndefined();
  });
});

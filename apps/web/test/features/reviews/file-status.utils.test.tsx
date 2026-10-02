import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FILE_STATUSES } from '@chaff/common/enums/review.enums';

import { FileStatusBadge } from '@~/features/reviews/components/file-status-badge';
import {
  describeFileStatus,
  formatModeChange,
  formatRenamePath,
  summarizeFileStatuses,
} from '@~/features/reviews/file-status.utils';

import { snapshotFile } from './review-fixtures';

describe('FileStatusBadge', () => {
  it('shows the git letter and spells the change out for assistive tech', () => {
    render(
      <>
        <FileStatusBadge file={snapshotFile('src/new.ts', { status: FILE_STATUSES.ADDED, oldMode: undefined })} />
        <FileStatusBadge file={snapshotFile('src/gone.ts', { status: FILE_STATUSES.DELETED, newMode: undefined })} />
        <FileStatusBadge
          file={snapshotFile('lib/util.ts', { status: FILE_STATUSES.RENAMED, oldPath: 'src/util.ts' })}
        />
        <FileStatusBadge file={snapshotFile('pointer', { status: FILE_STATUSES.TYPE_CHANGED })} />
      </>,
    );

    expect(screen.getByRole('img', { name: 'Added' })).toHaveTextContent('A');
    expect(screen.getByRole('img', { name: 'Deleted' })).toHaveTextContent('D');
    expect(screen.getByRole('img', { name: 'Moved from src/util.ts' })).toHaveTextContent('R');
    expect(screen.getByRole('img', { name: 'Type changed' })).toHaveTextContent('T');
  });
});

describe('describeFileStatus', () => {
  it('calls a rename in the same folder a rename and one across folders a move', () => {
    expect(
      describeFileStatus(snapshotFile('src/next.ts', { status: FILE_STATUSES.RENAMED, oldPath: 'src/prev.ts' })),
    ).toBe('Renamed from src/prev.ts');
    expect(
      describeFileStatus(snapshotFile('lib/prev.ts', { status: FILE_STATUSES.RENAMED, oldPath: 'src/prev.ts' })),
    ).toBe('Moved from src/prev.ts');
  });

  it('notes a mode change next to the status', () => {
    expect(describeFileStatus(snapshotFile('run.sh', { newMode: '100755' }))).toBe('Modified, mode +x');
  });
});

describe('formatModeChange', () => {
  it('reads the executable bit as +x or -x and leaves other modes as they are', () => {
    expect(formatModeChange('100644', '100755')).toBe('+x');
    expect(formatModeChange('100755', '100644')).toBe('-x');
    expect(formatModeChange('100644', '120000')).toBe('100644 → 120000');
    expect(formatModeChange('100644', '100644')).toBeUndefined();
    expect(formatModeChange(undefined, '100644')).toBeUndefined();
  });
});

describe('formatRenamePath', () => {
  it('keeps the shared folder outside the braces', () => {
    expect(formatRenamePath('src/old.ts', 'src/new.ts')).toBe('src/{old.ts → new.ts}');
  });

  it('keeps the shared file name outside the braces for a move', () => {
    expect(formatRenamePath('src/a/x.ts', 'src/b/x.ts')).toBe('src/{a → b}/x.ts');
  });

  it('never leaves one side of the arrow empty', () => {
    expect(formatRenamePath('src/x.ts', 'src/deep/x.ts')).toBe('src/{x.ts → deep/x.ts}');
    expect(formatRenamePath('x.ts', 'lib/x.ts')).toBe('x.ts → lib/x.ts');
  });

  it('shows both paths in full when they share nothing', () => {
    expect(formatRenamePath('a/one.ts', 'b/two.ts')).toBe('a/one.ts → b/two.ts');
  });
});

describe('summarizeFileStatuses', () => {
  it('counts each kind of change except plain modifications', () => {
    const files = [
      snapshotFile('src/a.ts', { status: FILE_STATUSES.ADDED }),
      snapshotFile('src/b.ts', { status: FILE_STATUSES.ADDED }),
      snapshotFile('src/c.ts'),
      snapshotFile('src/d.ts', { status: FILE_STATUSES.DELETED }),
      snapshotFile('lib/e.ts', { status: FILE_STATUSES.RENAMED, oldPath: 'src/e.ts' }),
    ];

    expect(summarizeFileStatuses(files)).toBe('2 added, 1 deleted, 1 moved');
    expect(summarizeFileStatuses([snapshotFile('src/c.ts')])).toBe('');
  });
});

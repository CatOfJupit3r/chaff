import { describe, expect, it } from 'vitest';

import { formatBranchTitle } from '@~/features/overview/branch-title.utils';

describe('branch titles', () => {
  it('leads with the ticket key and capitalizes the words of the rest of the name', () => {
    expect(formatBranchTitle('PROJ-482-add-the-retry-queue')).toBe('PROJ-482 | Add The Retry Queue');
    expect(formatBranchTitle('codex/proj-517-preview-04')).toBe('PROJ-517 | Codex / Preview 04');
    expect(formatBranchTitle('backup-PROJ-530-prototype-ui')).toBe('PROJ-530 | Backup Prototype Ui');
  });

  it('keeps a bare ticket and capitalizes names without one', () => {
    expect(formatBranchTitle('PROJ-91')).toBe('PROJ-91');
    expect(formatBranchTitle('document-preview_component')).toBe('Document Preview Component');
    expect(formatBranchTitle('feature/retry-queue')).toBe('Feature / Retry Queue');
  });
});

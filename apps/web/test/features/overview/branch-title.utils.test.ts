import { describe, expect, it } from 'vitest';

import { formatBranchTitle } from '@~/features/overview/branch-title.utils';

describe('branch titles', () => {
  it('leads with the ticket key and capitalizes the words of the rest of the name', () => {
    expect(formatBranchTitle('AB-10313-assemble-the-extraction-workbench')).toBe(
      'AB-10313 | Assemble The Extraction Workbench',
    );
    expect(formatBranchTitle('codex/ab-10120-preview-04')).toBe('AB-10120 | Codex / Preview 04');
    expect(formatBranchTitle('backup-AB-10275-prototype-ui')).toBe('AB-10275 | Backup Prototype Ui');
  });

  it('keeps a bare ticket and capitalizes names without one', () => {
    expect(formatBranchTitle('AB-9807')).toBe('AB-9807');
    expect(formatBranchTitle('document-preview_component')).toBe('Document Preview Component');
    expect(formatBranchTitle('feature/retry-queue')).toBe('Feature / Retry Queue');
  });
});

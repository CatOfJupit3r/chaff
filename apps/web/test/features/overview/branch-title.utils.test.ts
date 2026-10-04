import { describe, expect, it } from 'vitest';

import { formatBranchTitle } from '@~/features/overview/branch-title.utils';

describe('branch titles', () => {
  it('leads with the ticket key and writes the rest of the name in PascalCase', () => {
    expect(formatBranchTitle('AB-10313-assemble-the-extraction-workbench')).toBe(
      'AB-10313 | AssembleTheExtractionWorkbench',
    );
    expect(formatBranchTitle('codex/ab-10120-preview-04')).toBe('AB-10120 | Codex/Preview04');
    expect(formatBranchTitle('backup-AB-10275-prototype-ui')).toBe('AB-10275 | BackupPrototypeUi');
  });

  it('keeps a bare ticket and PascalCases names without one', () => {
    expect(formatBranchTitle('AB-9807')).toBe('AB-9807');
    expect(formatBranchTitle('document-preview_component')).toBe('DocumentPreviewComponent');
    expect(formatBranchTitle('feature/retry-queue')).toBe('Feature/RetryQueue');
  });
});

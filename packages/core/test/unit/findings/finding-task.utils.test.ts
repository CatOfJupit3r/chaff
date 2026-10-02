import { describe, expect, it } from 'vitest';

import { checkTask } from '@~/features/findings/finding-task.utils';

describe('checkTask', () => {
  it('trims the task and drops an empty way to verify it', () => {
    expect(checkTask({ task: '  Rename x to retries. ', verify: ' ' })).toEqual({
      task: 'Rename x to retries.',
      verify: undefined,
    });
  });

  it('refuses an empty task, an essay, or another shape', () => {
    expect(checkTask({ task: '  ', verify: '' })).toBeUndefined();
    expect(checkTask({ task: 'x'.repeat(601), verify: '' })).toBeUndefined();
    expect(checkTask({ task: 'Fix it', verify: '', extra: true })).toBeUndefined();
    expect(checkTask('Fix it')).toBeUndefined();
  });
});

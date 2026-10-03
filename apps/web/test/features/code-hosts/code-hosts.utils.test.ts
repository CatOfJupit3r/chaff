import { describe, expect, it } from 'vitest';

import { CODE_HOSTS } from '@chaff/common/enums/code-host.enums';

import type { iDiscussion } from '@~/features/code-hosts/code-hosts.types';
import { changeLabel, discussionsInRange } from '@~/features/code-hosts/code-hosts.utils';

function discussion(id: string, path: string, newLine?: number): iDiscussion {
  return { id, path, newLine, isResolved: false, isOnSnapshot: true, notes: [] };
}

describe('changeLabel', () => {
  it('writes the number the way each host does', () => {
    expect(changeLabel(CODE_HOSTS.GITLAB, 412)).toBe('!412');
    expect(changeLabel(CODE_HOSTS.GITHUB, 412)).toBe('#412');
  });
});

describe('discussionsInRange', () => {
  it("keeps the threads on the file's lines inside the range", () => {
    const threads = [
      discussion('in', 'src/a.ts', 4),
      discussion('after', 'src/a.ts', 9),
      discussion('other file', 'src/b.ts', 4),
      discussion('old side', 'src/a.ts'),
    ];

    expect(discussionsInRange(threads, 'src/a.ts', 2, 6).map((thread) => thread.id)).toEqual(['in']);
    expect(discussionsInRange(threads, 'src/a.ts', undefined, 6)).toEqual([]);
  });
});

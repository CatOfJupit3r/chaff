import { describe, expect, it } from 'vitest';

import { parseNumstat } from '@~/features/reviews/snapshots/numstat.utils';

describe('parseNumstat', () => {
  it('reads changed, renamed and binary files', () => {
    const output = ['3\t1\tsrc/a.ts', '0\t0\t', 'old/b.ts', 'new/b.ts', '-\t-\timage.png', ''].join('\0');

    expect(parseNumstat(output)).toEqual([
      { path: 'src/a.ts', additions: 3, deletions: 1 },
      { path: 'new/b.ts', additions: 0, deletions: 0 },
      { path: 'image.png', additions: 0, deletions: 0 },
    ]);
  });
});

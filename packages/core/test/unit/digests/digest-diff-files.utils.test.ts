import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { writeDiffFiles } from '@~/features/digests/digest-diff-files.utils';

const filePatch = (filePath: string, body: string) =>
  `diff --git a/${filePath} b/${filePath}\n--- a/${filePath}\n+++ b/${filePath}\n@@ -1 +1 @@\n${body}\n`;

describe('writeDiffFiles', () => {
  it("writes each file's diff under its own path and the whole branch's beside them", async () => {
    const directory = path.join(mkdtempSync(path.join(tmpdir(), 'chaff-diffs-')), 'diff');
    const first = filePatch('src/a.ts', '-old\n+new');
    const second = filePatch('docs/readme.md', '+hello');

    await writeDiffFiles(directory, first + second);

    expect(readFileSync(path.join(directory, 'src/a.ts.diff'), 'utf8')).toBe(first);
    expect(readFileSync(path.join(directory, 'docs/readme.md.diff'), 'utf8')).toBe(second);
    expect(readFileSync(path.join(directory, 'all.diff'), 'utf8')).toBe(first + second);
  });

  it('never writes outside the folder', async () => {
    const parent = mkdtempSync(path.join(tmpdir(), 'chaff-diffs-'));
    const directory = path.join(parent, 'diff');

    await writeDiffFiles(directory, filePatch('../escaped.ts', '+x'));

    expect(existsSync(path.join(parent, 'escaped.ts.diff'))).toBe(false);
  });
});

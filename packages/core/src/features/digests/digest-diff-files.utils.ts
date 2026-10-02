import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { splitPatch } from './digest-patch.utils';

/** The whole branch's diff, next to the per-file ones. */
export const WHOLE_DIFF_FILE = 'all.diff';
export const FILE_DIFF_EXTENSION = '.diff';

/** Where a file's diff is written: its repository path under `directory`, with `.diff` added. */
export function diffFileFor(directory: string, filePath: string) {
  return path.join(directory, `${filePath}${FILE_DIFF_EXTENSION}`);
}

/**
 * Writes every file's diff, and the whole branch's, under `directory`, so the agent reads only what it
 * needs. A path that would land outside the folder is skipped.
 */
export async function writeDiffFiles(directory: string, patch: string) {
  const root = path.resolve(directory);
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, WHOLE_DIFF_FILE), patch);
  for (const file of splitPatch(patch)) {
    const target = path.resolve(diffFileFor(root, file.path));
    if (!target.startsWith(`${root}${path.sep}`)) continue;
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.text);
  }
}

import { FILE_STATUSES } from '@chaff/common/enums/review.enums';
import type { FileStatus } from '@chaff/common/enums/review.enums';

import type { iRawDiffEntry } from './diff.types';

const RAW_STATUS_LETTERS: Record<string, FileStatus> = {
  A: FILE_STATUSES.ADDED,
  C: FILE_STATUSES.ADDED,
  D: FILE_STATUSES.DELETED,
  M: FILE_STATUSES.MODIFIED,
  R: FILE_STATUSES.RENAMED,
  T: FILE_STATUSES.TYPE_CHANGED,
};

const ABSENT_MODE = '000000';
const ABSENT_SHA_PATTERN = /^0+$/;

/** Parses `git diff --raw -z --no-abbrev`, where renames and copies carry two NUL-separated paths. */
export function parseRawDiff(output: string): iRawDiffEntry[] {
  const fields = output.split('\0');
  const entries: iRawDiffEntry[] = [];

  let index = 0;
  while (index < fields.length) {
    const meta = fields[index] ?? '';
    if (!meta.startsWith(':')) {
      index += 1;
      continue;
    }

    const [oldMode = '', newMode = '', oldSha = '', newSha = '', statusField = ''] = meta.slice(1).split(' ');
    const letter = statusField.charAt(0);
    const hasTwoPaths = letter === 'R' || letter === 'C';
    const firstPath = fields[index + 1] ?? '';
    const secondPath = hasTwoPaths ? (fields[index + 2] ?? '') : firstPath;
    index += hasTwoPaths ? 3 : 2;

    entries.push({
      status: RAW_STATUS_LETTERS[letter] ?? FILE_STATUSES.MODIFIED,
      path: secondPath,
      oldPath: firstPath,
      oldMode: oldMode === ABSENT_MODE ? undefined : oldMode,
      newMode: newMode === ABSENT_MODE ? undefined : newMode,
      oldBlobSha: ABSENT_SHA_PATTERN.test(oldSha) ? undefined : oldSha,
      newBlobSha: ABSENT_SHA_PATTERN.test(newSha) ? undefined : newSha,
    });
  }

  return entries;
}

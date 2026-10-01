import { FILE_STATUSES } from '@chaff/common/enums/review.enums';

import { UnexpectedServerError } from '@~/lib/orpc-error-wrapper';

import { DIFF_LINE_TYPES } from './diff.enums';
import type { iDiffLine, iParsedPatch, iRawDiffEntry } from './diff.types';

const SECTION_HEADER = 'diff --git ';
const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

/** Splits `git diff` patch output into one string per `diff --git` section, keeping each section verbatim. */
export function splitPatchSections(patch: string): string[] {
  const starts: number[] = patch.startsWith(SECTION_HEADER) ? [0] : [];
  let index = patch.indexOf(`\n${SECTION_HEADER}`);
  while (index !== -1) {
    starts.push(index + 1);
    index = patch.indexOf(`\n${SECTION_HEADER}`, index + 1);
  }
  return starts.map((start, position) => patch.slice(start, starts[position + 1] ?? patch.length));
}

/**
 * Gives every raw entry its patch text. Both commands list files in the same order; a type change
 * (file to symlink, for example) is printed as a deletion section followed by a creation section.
 */
export function assignPatchSections(entries: readonly iRawDiffEntry[], sections: readonly string[]): string[] {
  let cursor = 0;
  const patches = entries.map((entry) => {
    const count = entry.status === FILE_STATUSES.TYPE_CHANGED ? 2 : 1;
    const patch = sections.slice(cursor, cursor + count).join('');
    cursor += count;
    return patch;
  });

  if (cursor !== sections.length) {
    throw new UnexpectedServerError(
      `git diff listed ${entries.length} files but printed ${sections.length} patch sections`,
    );
  }
  return patches;
}

/** Reads the changed and context lines of one file's patch, numbering them on both sides. */
export function parsePatch(patch: string): iParsedPatch {
  const rows = patch.split('\n');
  const lines: iDiffLine[] = [];
  let isBinary = false;
  let hunkIndex = -1;
  let index = 0;

  while (index < rows.length) {
    const row = rows[index] ?? '';
    index += 1;

    const header = HUNK_HEADER.exec(row);
    if (!header) {
      if (row.startsWith('Binary files ') || row === 'GIT binary patch') isBinary = true;
      continue;
    }

    hunkIndex += 1;
    let oldRemaining = header[2] === undefined ? 1 : Number(header[2]);
    let newRemaining = header[4] === undefined ? 1 : Number(header[4]);
    // An empty side ("-5,0") names the line before the hunk; count from the line after it.
    let oldLine = Number(header[1]) + (oldRemaining === 0 ? 1 : 0);
    let newLine = Number(header[3]) + (newRemaining === 0 ? 1 : 0);

    while ((oldRemaining > 0 || newRemaining > 0) && index < rows.length) {
      const line = rows[index] ?? '';
      index += 1;
      const marker = line.charAt(0);
      const text = line.slice(1);

      if (marker === '\\') continue;
      if (marker === '+') {
        lines.push({ type: DIFF_LINE_TYPES.ADDED, newLine, text, hunkIndex });
        newLine += 1;
        newRemaining -= 1;
      } else if (marker === '-') {
        lines.push({ type: DIFF_LINE_TYPES.DELETED, oldLine, text, hunkIndex });
        oldLine += 1;
        oldRemaining -= 1;
      } else {
        // A context line; `diff.suppressBlankEmpty` prints an empty context line without its space.
        lines.push({ type: DIFF_LINE_TYPES.CONTEXT, oldLine, newLine, text, hunkIndex });
        oldLine += 1;
        newLine += 1;
        oldRemaining -= 1;
        newRemaining -= 1;
      }
    }
  }

  return { isBinary, lines };
}

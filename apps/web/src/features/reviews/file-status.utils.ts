import { FILE_STATUS_LABELS, FILE_STATUSES, fileStatusesEnumwaii } from '@chaff/common/enums/review.enums';
import type { FileStatus } from '@chaff/common/enums/review.enums';

/** The parts of a changed file that say how it changed. */
export interface iFileStatusInput {
  path: string;
  status: FileStatus;
  oldPath?: string;
  oldMode?: string;
  newMode?: string;
}

/** A rename split around the segments both paths share, as in `src/{old.ts → new.ts}`. */
export interface iRenameParts {
  prefix: string;
  from: string;
  to: string;
  suffix: string;
}

const REGULAR_MODE = '100644';
const EXECUTABLE_MODE = '100755';

function folderOf(path: string) {
  return path.slice(0, path.lastIndexOf('/') + 1);
}

/** The previous path of a renamed file, when it differs from the current one. */
function renamedFrom(file: iFileStatusInput) {
  if (file.status !== FILE_STATUSES.RENAMED || !file.oldPath || file.oldPath === file.path) return undefined;
  return file.oldPath;
}

/** "+x" or "-x" for the executable bit, else both modes; undefined when the mode stayed the same. */
export function formatModeChange(oldMode: string | undefined, newMode: string | undefined) {
  if (!oldMode || !newMode || oldMode === newMode) return undefined;
  if (oldMode === REGULAR_MODE && newMode === EXECUTABLE_MODE) return '+x';
  if (oldMode === EXECUTABLE_MODE && newMode === REGULAR_MODE) return '-x';
  return `${oldMode} → ${newMode}`;
}

/** "Moved" when the file went to another folder, "Renamed" when only its name changed, else the status label. */
export function fileStatusName(file: iFileStatusInput) {
  const oldPath = renamedFrom(file);
  if (oldPath === undefined) return FILE_STATUS_LABELS(file.status);
  return folderOf(oldPath) === folderOf(file.path) ? 'Renamed' : 'Moved';
}

/** The full wording behind a status letter, such as "Moved from src/old/a.ts" or "Modified, mode +x". */
export function describeFileStatus(file: iFileStatusInput) {
  const oldPath = renamedFrom(file);
  const name = oldPath === undefined ? fileStatusName(file) : `${fileStatusName(file)} from ${oldPath}`;
  const modeChange = formatModeChange(file.oldMode, file.newMode);
  return modeChange ? `${name}, mode ${modeChange}` : name;
}

/**
 * Splits a rename around the leading folders and trailing segments both paths share, keeping at least one
 * segment on each side so neither side is empty.
 */
export function splitRenamePath(oldPath: string, newPath: string): iRenameParts {
  const oldSegments = oldPath.split('/');
  const newSegments = newPath.split('/');
  const shortest = Math.min(oldSegments.length, newSegments.length);

  let lead = 0;
  while (lead < shortest - 1 && oldSegments[lead] === newSegments[lead]) lead += 1;
  let trail = 0;
  while (
    lead + trail < shortest - 1 &&
    oldSegments[oldSegments.length - 1 - trail] === newSegments[newSegments.length - 1 - trail]
  ) {
    trail += 1;
  }

  const shared = oldSegments.slice(0, lead).join('/');
  const tail = oldSegments.slice(oldSegments.length - trail).join('/');
  return {
    prefix: lead > 0 ? `${shared}/` : '',
    from: oldSegments.slice(lead, oldSegments.length - trail).join('/'),
    to: newSegments.slice(lead, newSegments.length - trail).join('/'),
    suffix: trail > 0 ? `/${tail}` : '',
  };
}

/** A rename on one line: `src/{old.ts → new.ts}`, or `old → new` when the paths share nothing. */
export function formatRenamePath(oldPath: string, newPath: string) {
  const { prefix, from, to, suffix } = splitRenamePath(oldPath, newPath);
  if (prefix === '' && suffix === '') return `${from} → ${to}`;
  return `${prefix}{${from} → ${to}}${suffix}`;
}

/** The rename parts of a renamed or moved file, undefined for every other change. */
export function renameParts(file: iFileStatusInput) {
  const oldPath = renamedFrom(file);
  return oldPath === undefined ? undefined : splitRenamePath(oldPath, file.path);
}

/** Counts per kind of change, such as "3 added, 1 deleted, 1 moved"; modified files are left out. */
export function summarizeFileStatuses(files: readonly iFileStatusInput[]) {
  const counts = new Map<string, number>();
  for (const status of fileStatusesEnumwaii.values) {
    if (status === FILE_STATUSES.MODIFIED) continue;
    for (const file of files) {
      if (file.status !== status) continue;
      const name = fileStatusName(file).toLowerCase();
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts].map(([name, count]) => `${count} ${name}`).join(', ');
}

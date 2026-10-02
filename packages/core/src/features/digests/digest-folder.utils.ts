import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { FILE_STATUS_LABELS } from '@chaff/common/enums/review.enums';
import type { FileStatus } from '@chaff/common/enums/review.enums';

import { describeUnit } from './digest-prompt.utils';
import type { iPromptUnit } from './digests.types';

/** Folder Chaff writes at the root of the digest's throwaway checkout, for the agent to read. */
export const CHAFF_FOLDER = '.chaff';

/** One changed file as the folder holds it. */
export interface iFolderFile {
  path: string;
  /** The path on the parent side; same as `path` unless the file was renamed. */
  oldPath: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  /** The file's section of the branch's diff. */
  patch: string;
  /** The file as it is on the parent side; absent for an added or binary file. */
  base?: string;
}

export interface iChaffFolderInput {
  baseSha: string;
  headSha: string;
  files: readonly iFolderFile[];
  units: readonly iPromptUnit[];
}

/** Where the agent finds one file's patch, relative to the checkout. */
export const diffFilePath = (filePath: string) => `${CHAFF_FOLDER}/diff/${filePath}.patch`;

/** Where the agent finds the parent side of a file, relative to the checkout. */
export const baseFilePath = (filePath: string) => `${CHAFF_FOLDER}/base/${filePath}`;

/** A repository path that stays inside the folder it is written under. */
function isContainedPath(filePath: string) {
  if (!filePath || filePath.includes('\0') || path.posix.isAbsolute(filePath) || /^[a-z]:/i.test(filePath)) {
    return false;
  }
  return !filePath.split(/[/\\]/).some((segment) => segment === '..' || segment === '');
}

function readme({ baseSha, headSha }: iChaffFolderInput) {
  return `# What Chaff prepared for this digest

This folder is not part of the branch. Chaff wrote it into this throwaway checkout so you can read the change in
pieces. Never review it, cite a file in it as a test, or mention it as a changed file.

The rest of the working directory is the branch's head commit (${headSha.slice(0, 10)}), so the current version of a
changed file is at its usual path. The parent side is the merge base (${baseSha.slice(0, 10)}).

- \`${CHAFF_FOLDER}/units.md\`: every changed file with its status and line counts, and every unit of change with
  its id, kind, name and line ranges. Refer to units only by these ids.
- \`${CHAFF_FOLDER}/diff/<path>.patch\`: the unified diff of one changed file. \`<path>\` is the file's path on the
  branch; a deleted file keeps its old path.
- \`${CHAFF_FOLDER}/base/<path>\`: the whole file as it was on the parent side, for a file that was modified,
  deleted, renamed (under its old path) or changed type. Added and binary files have none.

Open these files by their paths: searches may skip this folder. Read the patch of every file whose units you write about. Open the base file when you need what the code was before
beyond the patch's context lines, and the current file for what surrounds a change.
`;
}

function unitsList({ files, units }: iChaffFolderInput) {
  const sections = files.map((file) => {
    const fileUnits = units.filter((unit) => unit.path === file.path);
    const renamed = file.oldPath === file.path ? '' : `, from ${file.oldPath}`;
    const lines = [
      `## ${file.path} (${FILE_STATUS_LABELS(file.status).toLowerCase()}${renamed}, +${file.additions} -${file.deletions})`,
      '',
      `Diff: ${diffFilePath(file.path)}`,
      ...(file.base === undefined ? [] : [`Parent version: ${baseFilePath(file.oldPath)}`]),
      '',
      ...(fileUnits.length > 0 ? fileUnits.map((unit) => `- ${describeUnit(unit)}`) : ['- (no units)']),
    ];
    return lines.join('\n');
  });
  return `# Units of change

Every changed line belongs to exactly one unit. Line ranges are 1-based and inclusive: \`old\` on the parent side,
\`new\` on the branch.

${sections.join('\n\n')}
`;
}

/**
 * The files of the `.chaff/` folder, by path relative to the checkout: a README, the list of units, one patch per
 * changed file and the parent side of each file that had one. Paths that could leave the folder are left out.
 */
export function buildChaffFolder(input: iChaffFolderInput) {
  const folder = new Map<string, string>([
    [`${CHAFF_FOLDER}/.gitignore`, '*\n'],
    [`${CHAFF_FOLDER}/README.md`, readme(input)],
    [`${CHAFF_FOLDER}/units.md`, unitsList(input)],
  ]);
  for (const file of input.files) {
    if (isContainedPath(file.path)) folder.set(diffFilePath(file.path), file.patch);
    if (file.base !== undefined && isContainedPath(file.oldPath)) folder.set(baseFilePath(file.oldPath), file.base);
  }
  return folder;
}

/** Writes the folder into the checkout, replacing a `.chaff/` the branch itself may have. */
export async function writeChaffFolder(checkout: string, folder: ReadonlyMap<string, string>) {
  await rm(path.join(checkout, CHAFF_FOLDER), { recursive: true, force: true });
  for (const [relativePath, content] of folder) {
    const target = path.join(checkout, ...relativePath.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

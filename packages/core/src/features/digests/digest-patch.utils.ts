import { DIGEST_DIFF_DELIVERIES, DIGEST_DIFF_MODES } from '@chaff/common/enums/digest.enums';
import type { DigestDiffMode } from '@chaff/common/enums/digest.enums';

export interface iFilePatch {
  path: string;
  text: string;
}

export interface iOutlinedFile {
  path: string;
  additions: number;
  deletions: number;
  /** The file's `@@` hunk headers, which say where it changed. */
  hunks: string[];
}

const FILE_HEADER = /^diff --git a\/.* b\/(.*)$/;

/** Cuts a multi-file patch into one piece per file, in the patch's order. */
export function splitPatch(patch: string): iFilePatch[] {
  const files: iFilePatch[] = [];
  for (const line of patch.split(/(?<=\n)/)) {
    const header = FILE_HEADER.exec(line.trimEnd());
    if (header?.[1] !== undefined) files.push({ path: header[1], text: '' });
    const current = files.at(-1);
    if (current) current.text += line;
  }
  return files;
}

function outline(file: iFilePatch): iOutlinedFile {
  const lines = file.text.split('\n');
  return {
    path: file.path,
    additions: lines.filter((line) => line.startsWith('+') && !line.startsWith('+++')).length,
    deletions: lines.filter((line) => line.startsWith('-') && !line.startsWith('---')).length,
    hunks: lines.filter((line) => line.startsWith('@@')),
  };
}

/**
 * Fits a branch's diff into `budget` characters: files go in whole, in the patch's order, while they fit;
 * the rest are listed as an outline (counts and hunk headers) for the agent to read in the checkout.
 */
export function fitPatch(patch: string, budget: number) {
  if (patch.length <= budget) return { patch, outlined: [] };
  let used = 0;
  const included: string[] = [];
  const outlined: iOutlinedFile[] = [];
  for (const file of splitPatch(patch)) {
    if (used + file.text.length <= budget) {
      included.push(file.text);
      used += file.text.length;
    } else {
      outlined.push(outline(file));
    }
  }
  return { patch: included.join(''), outlined };
}

/** Every file of a patch as an outline: counts and hunk headers, without the lines. */
export function outlinePatch(patch: string) {
  return splitPatch(patch).map(outline);
}

/**
 * Settles how a digest's prompt carries the diff. Inline puts it in the prompt (files past `maxInlineChars` are
 * outlined); on demand outlines every file and the agent reads the patches from `.chaff/`. Auto inlines a diff of up
 * to `thresholdChars`.
 */
export function planPromptDiff(mode: DigestDiffMode, patch: string, thresholdChars: number, maxInlineChars: number) {
  const isInline =
    mode === DIGEST_DIFF_MODES.INLINE || (mode === DIGEST_DIFF_MODES.AUTO && patch.length <= thresholdChars);
  if (isInline) return { delivery: DIGEST_DIFF_DELIVERIES.INLINE, ...fitPatch(patch, maxInlineChars) };
  return { delivery: DIGEST_DIFF_DELIVERIES.ON_DEMAND, patch: '', outlined: outlinePatch(patch) };
}

import path from 'node:path';

import { FILE_KINDS, fileKindsEnumwaii } from '@chaff/common/enums/review.enums';
import type { FileKind } from '@chaff/common/enums/review.enums';

interface iOrderableFile {
  path: string;
  kind: FileKind;
}

const CONTRACT_PATH =
  /(^|\/)(types?|interfaces?|contracts?|schemas?|models?)(\.|\/)|\.(contract|schema|types?)\.\w+$|\.d\.ts$|\.proto$|\.graphql$/;

const KIND_RANKS = fileKindsEnumwaii.derive({
  [FILE_KINDS.SOURCE]: 1,
  [FILE_KINDS.TEST]: 1,
  [FILE_KINDS.CONFIG]: 2,
  [FILE_KINDS.DOCS]: 3,
  [FILE_KINDS.GENERATED]: 4,
  [FILE_KINDS.BINARY]: 5,
});

function rank(file: iOrderableFile) {
  if (file.kind === FILE_KINDS.SOURCE && CONTRACT_PATH.test(file.path)) return 0;
  return KIND_RANKS(file.kind);
}

/** File name without test markers or extension, so `foo.test.ts` and `foo.ts` share a stem. */
function stem(filePath: string) {
  return path.posix
    .basename(filePath)
    .replace(/\.(test|spec)(?=\.)/, '')
    .replace(/_test(?=\.go$)/, '')
    .replace(/^test_/, '')
    .replace(/\.\w+$/, '');
}

/**
 * Orders files for reading: contracts and types first, then sources each followed by their tests,
 * then configuration, docs, generated files and binaries.
 */
export function sortByReadingOrder<TFile extends iOrderableFile>(files: readonly TFile[]): TFile[] {
  const sorted = [...files].sort((left, right) => rank(left) - rank(right) || left.path.localeCompare(right.path));
  const sourceStems = new Set(sorted.filter((file) => file.kind === FILE_KINDS.SOURCE).map((file) => stem(file.path)));
  const ordered: TFile[] = [];
  const placed = new Set<TFile>();

  for (const file of sorted) {
    if (placed.has(file)) continue;
    if (file.kind === FILE_KINDS.TEST && sourceStems.has(stem(file.path))) continue;
    ordered.push(file);
    placed.add(file);
    if (file.kind !== FILE_KINDS.SOURCE) continue;

    for (const candidate of sorted) {
      if (candidate.kind === FILE_KINDS.TEST && !placed.has(candidate) && stem(candidate.path) === stem(file.path)) {
        ordered.push(candidate);
        placed.add(candidate);
      }
    }
  }

  for (const file of sorted) {
    if (!placed.has(file)) ordered.push(file);
  }
  return ordered;
}

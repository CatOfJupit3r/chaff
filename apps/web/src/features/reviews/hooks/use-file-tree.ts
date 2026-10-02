import { useMemo } from 'react';

import { buildFileTree, filterFiles } from '../file-tree.utils';
import type { iSnapshotFile } from '../reviews.types';

/** The files whose path matches the query, and the folder tree built from them; rebuilt only when either changes. */
export function useFileTree(files: readonly iSnapshotFile[], query: string) {
  return useMemo(() => {
    const matches = filterFiles(files, query);
    return { matches, tree: buildFileTree(matches) };
  }, [files, query]);
}

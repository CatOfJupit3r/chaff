import type { FileDiffContentsLoader } from '@pierre/diffs';
import { useQueryClient } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iSnapshotFile } from '../reviews.types';

/** Loads both sides of a file from the snapshot store so the diff can show more context around its hunks. */
export function useLoadDiffFiles(snapshotId: string, file: iSnapshotFile): FileDiffContentsLoader {
  const queryClient = useQueryClient();

  return async () => {
    const { oldContents, newContents } = await queryClient.fetchQuery(
      tanstackRPC.reviews.fileContents.queryOptions({
        input: { snapshotId, fileId: file.id },
        staleTime: Infinity,
      }),
    );
    if (newContents === null) throw new Error(`The new contents of ${file.path} are not available`);

    const newFile = { name: file.path, contents: newContents };
    if (oldContents === null) return { oldFile: null, newFile };
    return { oldFile: { name: file.oldPath ?? file.path, contents: oldContents }, newFile };
  };
}

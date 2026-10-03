import { useQuery } from '@tanstack/react-query';

import { UNIT_REVISIONS } from '@chaff/common/enums/review.enums';

import type { iUnit } from '@~/features/reviews/reviews.types';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** The earlier version of an edited unit the reviewer decided on, with the file it sits in now. */
export function useUnitInterdiff(snapshotId: string, unit: iUnit) {
  const isEdited = unit.revision === UNIT_REVISIONS.EDITED;
  const interdiff = useQuery(
    tanstackRPC.reviews.unitInterdiff.queryOptions({
      input: { snapshotId, unitId: unit.id },
      staleTime: Infinity,
      enabled: isEdited,
    }),
  );
  const contents = useQuery(
    tanstackRPC.reviews.fileContents.queryOptions({
      input: { snapshotId, fileId: unit.fileId },
      staleTime: Infinity,
      enabled: isEdited && Boolean(interdiff.data?.reviewed),
    }),
  );
  return { reviewed: interdiff.data?.reviewed ?? undefined, contents: contents.data };
}

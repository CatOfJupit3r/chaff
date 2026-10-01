import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unitMarkSchema } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import type { iUnit } from '@~/features/reviews/reviews.types';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { unitsQueryOptions } from './use-units';

/**
 * Records a decision on a unit. The unit list updates at once so the next card can open without
 * waiting; a failed write puts the list back.
 */
export function useSetMark(snapshotId: string) {
  const queryClient = useQueryClient();
  const { queryKey } = unitsQueryOptions(snapshotId);

  const writeMark = (unitId: string, mark: UnitMark | undefined) => {
    queryClient.setQueryData<iUnit[]>(queryKey, (units) =>
      units?.map((unit) => (unit.id === unitId ? { ...unit, mark } : unit)),
    );
  };

  return useMutation(
    tanstackRPC.reviews.setMark.mutationOptions({
      onMutate: async ({ unitId, mark }) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<iUnit[]>(queryKey)?.find((unit) => unit.id === unitId)?.mark;
        writeMark(unitId, mark === undefined ? undefined : unitMarkSchema.parse(mark));
        return { previous };
      },
      onError: (_error, { unitId }, context) => writeMark(unitId, context?.previous),
      onSettled: async () => queryClient.invalidateQueries({ queryKey: tanstackRPC.reviews.list.key() }),
    }),
  );
}

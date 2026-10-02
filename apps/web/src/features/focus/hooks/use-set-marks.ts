import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unitMarkSchema } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import type { iUnit } from '@~/features/reviews/reviews.types';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { unitsQueryOptions } from './use-units';

/** A decision on one unit; no mark clears it. */
export interface iUnitMarkChange {
  unitId: string;
  mark?: UnitMark;
}

/**
 * Records decisions on units. The unit list updates at once so the next card can open without waiting;
 * a failed write puts the list back.
 */
export function useSetMarks(snapshotId: string) {
  const queryClient = useQueryClient();
  const { queryKey } = unitsQueryOptions(snapshotId);

  // Mutation input carries plain strings; they are parsed back into marks for the cache.
  const writeMarks = (marks: readonly { unitId: string; mark?: string }[]) => {
    const byUnit = new Map(marks.map(({ unitId, mark }) => [unitId, mark]));
    queryClient.setQueryData<iUnit[]>(queryKey, (units) =>
      units?.map((unit) => {
        if (!byUnit.has(unit.id)) return unit;
        const mark = byUnit.get(unit.id);
        return { ...unit, mark: mark === undefined ? undefined : unitMarkSchema.parse(mark) };
      }),
    );
  };

  return useMutation(
    tanstackRPC.reviews.setMarks.mutationOptions({
      onMutate: async ({ marks }) => {
        await queryClient.cancelQueries({ queryKey });
        const units = queryClient.getQueryData<iUnit[]>(queryKey) ?? [];
        const previous = marks.map(({ unitId }) => ({
          unitId,
          mark: units.find((unit) => unit.id === unitId)?.mark,
        }));
        writeMarks(marks);
        return { previous };
      },
      onError: (_error, _input, context) => writeMarks(context?.previous ?? []),
      onSettled: async () => queryClient.invalidateQueries({ queryKey: tanstackRPC.reviews.list.key() }),
    }),
  );
}

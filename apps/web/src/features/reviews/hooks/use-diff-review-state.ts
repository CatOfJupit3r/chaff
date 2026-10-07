import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { showToast } from '@~/components/toast/toast-store';
import { useSetMarks } from '@~/features/focus/hooks/use-set-marks';
import { unitsQueryOptions } from '@~/features/focus/hooks/use-units';
import { getErrorMessage } from '@~/utils/rpc-errors';

import type { iDiffReview } from '../diff-review.context';
import { groupUnitsByFile } from '../review-coverage.utils';

export function useDiffReviewState(snapshotId: string): iDiffReview {
  const units = useQuery(unitsQueryOptions(snapshotId)).data;
  const setMarks = useSetMarks(snapshotId);
  const unitsByFile = useMemo(() => groupUnitsByFile(units ?? []), [units]);

  const markFile = (fileId: string, skipReason?: string) => {
    const mark = skipReason ? UNIT_MARKS.SKIPPED : UNIT_MARKS.LOOKS_GOOD;
    const undecided = (unitsByFile.get(fileId) ?? []).filter((unit) => unit.mark === undefined);
    if (undecided.length > 0) {
      setMarks.mutate(
        { snapshotId, marks: undecided.map((unit) => ({ unitId: unit.id, mark, skipReason })) },
        { onError: (error) => showToast(getErrorMessage(error)) },
      );
    }
    const done = skipReason ? 'Skipped' : 'Marked as looking good';
    showToast(undecided.length === 0 ? 'Every unit in this file already has a decision' : done);
  };

  return { unitsByFile, markFile };
}

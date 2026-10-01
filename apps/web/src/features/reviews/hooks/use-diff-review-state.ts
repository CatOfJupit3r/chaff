import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { FindingKind } from '@chaff/common/enums/review.enums';

import { showToast } from '@~/components/toast/toast-store';
import { FINDING_KIND_LABELS } from '@~/features/findings/findings.enums';
import { useFindingMutations } from '@~/features/findings/hooks/use-finding-mutations';
import { useFindings } from '@~/features/findings/hooks/use-findings';
import { useSetMark } from '@~/features/focus/hooks/use-set-mark';
import { unitsQueryOptions } from '@~/features/focus/hooks/use-units';
import { getErrorMessage } from '@~/utils/rpc-errors';

import type { iDiffDraft, iDiffReview, iFindingPlacement } from '../diff-review.context';
import { groupUnitsByFile } from '../review-coverage.utils';
import type { iSnapshot } from '../reviews.types';

/** Places each finding written on this snapshot beside the line it points at: a unit's first line, or a range's last. */
function placeFindings(snapshotId: string, findings: ReturnType<typeof useFindings>) {
  const byFile = new Map<string, iFindingPlacement[]>();
  for (const finding of findings) {
    for (const anchor of finding.anchors) {
      const line = anchor.unitId ? anchor.startLine : anchor.endLine;
      if (anchor.snapshotId !== snapshotId || !anchor.fileId || line === undefined) continue;
      const placements = byFile.get(anchor.fileId) ?? [];
      placements.push({ finding, side: anchor.side, line });
      byFile.set(anchor.fileId, placements);
    }
  }
  return byFile;
}

export function useDiffReviewState(snapshot: iSnapshot): iDiffReview {
  const snapshotId = snapshot.id;
  const units = useQuery(unitsQueryOptions(snapshotId)).data;
  const findings = useFindings(snapshot.targetId);
  const { create } = useFindingMutations();
  const setMark = useSetMark(snapshotId);
  const [draft, setDraft] = useState<iDiffDraft>();
  const unitsByFile = useMemo(() => groupUnitsByFile(units ?? []), [units]);
  const placementsByFile = useMemo(() => placeFindings(snapshotId, findings), [snapshotId, findings]);

  const saveDraft = async (kind: FindingKind, body: string) => {
    if (!draft) return false;
    try {
      const finding = await create.mutateAsync({ snapshotId, kind, body, anchors: [draft] });
      showToast(`${FINDING_KIND_LABELS(kind)} F-${finding.number} saved`);
      setDraft(undefined);
      return true;
    } catch (error) {
      showToast(getErrorMessage(error));
      return false;
    }
  };

  const markFile = (fileId: string) => {
    const undecided = (unitsByFile.get(fileId) ?? []).filter((unit) => unit.mark === undefined);
    for (const unit of undecided) {
      setMark.mutate(
        { snapshotId, unitId: unit.id, mark: UNIT_MARKS.LOOKS_GOOD },
        { onError: (error) => showToast(getErrorMessage(error)) },
      );
    }
    showToast(undecided.length === 0 ? 'Every unit in this file already has a decision' : 'Marked as looking good');
  };

  return {
    headSha: snapshot.headSha,
    unitsByFile,
    placementsByFile,
    draft,
    isSaving: create.isPending,
    startDraft: setDraft,
    cancelDraft: () => setDraft(undefined),
    saveDraft,
    markFile,
  };
}

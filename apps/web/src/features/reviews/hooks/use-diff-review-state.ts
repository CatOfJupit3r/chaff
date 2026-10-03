import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { REVIEW_TARGET_KINDS, UNIT_MARKS, FINDING_KIND_LABELS } from '@chaff/common/enums/review.enums';
import type { FindingKind } from '@chaff/common/enums/review.enums';

import { showToast } from '@~/components/toast/toast-store';
import type { iDiscussion } from '@~/features/code-hosts/code-hosts.types';
import { useDiscussions } from '@~/features/code-hosts/hooks/use-discussions';
import { anchorIn } from '@~/features/findings/findings.utils';
import { useFindingMutations } from '@~/features/findings/hooks/use-finding-mutations';
import { useFindings } from '@~/features/findings/hooks/use-findings';
import { useSetMarks } from '@~/features/focus/hooks/use-set-marks';
import { unitsQueryOptions } from '@~/features/focus/hooks/use-units';
import { getErrorMessage } from '@~/utils/rpc-errors';

import type { iDiffDraft, iDiffReview, iFindingPlacement } from '../diff-review.context';
import { groupUnitsByFile } from '../review-coverage.utils';
import type { iSnapshot } from '../reviews.types';

/**
 * Places each finding beside the line it points at in this snapshot, where it was written or found again:
 * a unit's first line, or a range's last.
 */
function placeFindings(snapshotId: string, findings: ReturnType<typeof useFindings>) {
  const byFile = new Map<string, iFindingPlacement[]>();
  for (const finding of findings) {
    for (const anchor of finding.anchors) {
      const placed = anchorIn(anchor, snapshotId);
      const line = placed?.unitId ? placed.startLine : placed?.endLine;
      if (!placed?.fileId || line === undefined) continue;
      const placements = byFile.get(placed.fileId) ?? [];
      placements.push({ finding, side: anchor.side, line: Math.max(1, line) });
      byFile.set(placed.fileId, placements);
    }
  }
  return byFile;
}

/** Threads written against the snapshot's head, keyed by the id of the file they are on. */
function placeDiscussions(snapshot: iSnapshot, discussions: readonly iDiscussion[]) {
  const fileIds = new Map(snapshot.files.map((file) => [file.path, file.id]));
  const byFile = new Map<string, iDiscussion[]>();
  for (const discussion of discussions) {
    const fileId = discussion.path ? fileIds.get(discussion.path) : undefined;
    if (!fileId || !discussion.isOnSnapshot) continue;
    byFile.set(fileId, [...(byFile.get(fileId) ?? []), discussion]);
  }
  return byFile;
}

export function useDiffReviewState(snapshot: iSnapshot): iDiffReview {
  const snapshotId = snapshot.id;
  const units = useQuery(unitsQueryOptions(snapshotId)).data;
  const findings = useFindings(snapshot.targetId);
  const { create } = useFindingMutations();
  const setMarks = useSetMarks(snapshotId);
  const [draft, setDraft] = useState<iDiffDraft>();
  const unitsByFile = useMemo(() => groupUnitsByFile(units ?? []), [units]);
  const placementsByFile = useMemo(() => placeFindings(snapshotId, findings), [snapshotId, findings]);
  const discussions = useDiscussions(snapshotId, snapshot.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST);
  const discussionsByFile = useMemo(() => placeDiscussions(snapshot, discussions), [snapshot, discussions]);

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

  return {
    headSha: snapshot.headSha,
    unitsByFile,
    placementsByFile,
    discussionsByFile,
    draft,
    isSaving: create.isPending,
    startDraft: setDraft,
    cancelDraft: () => setDraft(undefined),
    saveDraft,
    markFile,
  };
}

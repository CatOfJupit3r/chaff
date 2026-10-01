import { useState } from 'react';

import { FINDING_KINDS, UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import { showToast } from '@~/components/toast/toast-store';
import { useFindingMutations } from '@~/features/findings/hooks/use-finding-mutations';
import { useFindings } from '@~/features/findings/hooks/use-findings';
import { useOpenInEditor } from '@~/features/reviews/hooks/use-open-in-editor';
import { useSnapshot } from '@~/features/reviews/hooks/use-snapshot';
import type { iUnit } from '@~/features/reviews/reviews.types';
import { useWorkspaces } from '@~/features/workspaces/hooks/use-workspaces';
import { getErrorMessage } from '@~/utils/rpc-errors';

import { FOCUS_END, findNextIndex, resolveIndex, withMark } from '../focus-queue.utils';
import { CARD_VIEWS, UNIT_MARK_EXITS } from '../focus.enums';
import { useCardExit } from './use-card-exit';
import { useFocusPosition } from './use-focus-position';
import { useSetMark } from './use-set-mark';
import { useUnits } from './use-units';

/** One decision, kept so Undo can put the unit back and delete the finding it wrote. */
interface iFocusStep {
  unitId: string;
  previousMark?: UnitMark;
  findingId?: string;
}

/** The marks that write a note first. */
export type CommentMark = typeof UNIT_MARKS.CONCERN | typeof UNIT_MARKS.QUESTION;

/** The Focus review: which card is up, and the decisions that move through the cards. */
export function useFocusReview(snapshotId: string) {
  const snapshot = useSnapshot(snapshotId);
  const units = useUnits(snapshotId);
  const position = useFocusPosition();
  const setMark = useSetMark(snapshotId);
  const findings = useFindingMutations();
  const cardExit = useCardExit();
  const [history, setHistory] = useState<iFocusStep[]>([]);
  const workspace = useWorkspaces().find((candidate) => candidate.id === snapshot.workspaceId);
  const openInEditor = useOpenInEditor(workspace?.repoPath ?? '');
  const findingsInReview = useFindings(snapshot.targetId);

  const index = resolveIndex(units, position.unit, position.queue);
  const unit: iUnit | undefined = units[index];
  const unitFindings = unit
    ? findingsInReview.filter((finding) => finding.anchors.some((anchor) => anchor.unitId === unit.id))
    : [];

  const goTo = (nextIndex: number) => {
    position.update({ unit: units[nextIndex]?.id ?? FOCUS_END, view: CARD_VIEWS.code });
  };

  const writeMark = (unitId: string, mark: UnitMark | undefined) => {
    setMark.mutate({ snapshotId, unitId, mark }, { onError: (error) => showToast(getErrorMessage(error)) });
  };

  const record = (current: iUnit, mark: UnitMark, findingId?: string) => {
    setHistory((steps) => [...steps, { unitId: current.id, previousMark: current.mark, findingId }]);
    writeMark(current.id, mark);
    const nextIndex = findNextIndex(withMark(units, current.id, mark), index, position.queue);
    cardExit.run(UNIT_MARK_EXITS(mark), () => goTo(nextIndex));
  };

  const decide = (mark: typeof UNIT_MARKS.LOOKS_GOOD | typeof UNIT_MARKS.LATER) => {
    if (unit) record(unit, mark);
  };

  /** Writes the note as a finding on the unit and moves on; resolves false when it could not be saved. */
  const comment = async (mark: CommentMark, body: string) => {
    if (!unit) return false;
    try {
      const finding = await findings.create.mutateAsync({
        snapshotId,
        kind: mark === UNIT_MARKS.CONCERN ? FINDING_KINDS.CONCERN : FINDING_KINDS.QUESTION,
        body,
        anchors: [{ unitId: unit.id }],
      });
      showToast(`${mark === UNIT_MARKS.CONCERN ? 'Concern' : 'Question'} F-${finding.number} saved`);
      record(unit, mark, finding.id);
      return true;
    } catch (error) {
      showToast(getErrorMessage(error));
      return false;
    }
  };

  const undo = () => {
    const step = history.at(-1);
    if (!step) {
      showToast('Nothing to undo');
      return;
    }
    setHistory((steps) => steps.slice(0, -1));
    writeMark(step.unitId, step.previousMark);
    if (step.findingId) {
      findings.remove.mutate({ findingId: step.findingId }, { onError: (error) => showToast(getErrorMessage(error)) });
    }
    position.update({ unit: step.unitId, view: CARD_VIEWS.code });
    showToast('Undone');
  };

  const move = (delta: number) => goTo(Math.min(units.length, Math.max(0, index + delta)));

  return {
    snapshot,
    repositoryName: workspace?.name ?? snapshot.branch,
    openInEditor,
    unitFindings,
    units,
    index,
    unit,
    queue: position.queue,
    view: position.view,
    setView: (view: typeof position.view) => position.update({ view }),
    setQueue: (queue: typeof position.queue) =>
      position.update({ queue, unit: units[findNextIndex(units, -1, queue)]?.id ?? FOCUS_END }),
    exit: cardExit.exit,
    canUndo: history.length > 0,
    isSaving: findings.create.isPending,
    decide,
    comment,
    undo,
    move,
    goTo,
  };
}

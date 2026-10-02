import { useMemo, useState } from 'react';

import { FINDING_KINDS, UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { ReviewProgression, UnitMark } from '@chaff/common/enums/review.enums';

import { showToast } from '@~/components/toast/toast-store';
import { useChangeUnits } from '@~/features/change-units/hooks/use-change-units';
import { readyContent, orderByReading } from '@~/features/digests/digests.utils';
import { useDigest } from '@~/features/digests/hooks/use-digest';
import { isOnUnit } from '@~/features/findings/findings.utils';
import { useFindingMutations } from '@~/features/findings/hooks/use-finding-mutations';
import { useFindings } from '@~/features/findings/hooks/use-findings';
import { useOpenInEditor } from '@~/features/reviews/hooks/use-open-in-editor';
import { useSnapshot } from '@~/features/reviews/hooks/use-snapshot';
import { useWorkspaces } from '@~/features/workspaces/hooks/use-workspaces';
import { getErrorMessage } from '@~/utils/rpc-errors';

import { buildFocusCards, FOCUS_END, findNextIndex, resolveIndex, withMarks } from '../focus-cards.utils';
import type { iFocusCard } from '../focus-cards.utils';
import { CARD_VIEWS, UNIT_MARK_EXITS } from '../focus.enums';
import { useCardExit } from './use-card-exit';
import { useFocusPosition } from './use-focus-position';
import { useSetMarks } from './use-set-marks';
import type { iUnitMarkChange } from './use-set-marks';
import { useUnits } from './use-units';

/** One decision, kept so Undo can put the card's units back and delete the finding it wrote. */
interface iFocusStep {
  cardId: string;
  previous: iUnitMarkChange[];
  findingId?: string;
}

/** The marks that write a note first. */
export type CommentMark = typeof UNIT_MARKS.CONCERN | typeof UNIT_MARKS.QUESTION;

/** The Focus review: which card is up, and the decisions that move through the cards. */
export function useFocusReview(snapshotId: string) {
  const snapshot = useSnapshot(snapshotId);
  const unitsInFileOrder = useUnits(snapshotId);
  const digest = useDigest(snapshotId);
  const changes = useChangeUnits(snapshotId, digest?.status);
  const readingOrder = readyContent(digest)?.readingOrder;
  const units = useMemo(() => orderByReading(unitsInFileOrder, readingOrder), [unitsInFileOrder, readingOrder]);
  const position = useFocusPosition();
  const cards = useMemo(
    () => buildFocusCards(units, changes, position.progression),
    [units, changes, position.progression],
  );
  const setMarks = useSetMarks(snapshotId);
  const findings = useFindingMutations();
  const cardExit = useCardExit();
  const [history, setHistory] = useState<iFocusStep[]>([]);
  const workspace = useWorkspaces().find((candidate) => candidate.id === snapshot.workspaceId);
  const openInEditor = useOpenInEditor(workspace?.repoPath ?? '');
  const findingsInReview = useFindings(snapshot.targetId);

  const index = resolveIndex(cards, position.unit, position.queue);
  const card: iFocusCard | undefined = cards[index];
  const cardFindings = card
    ? findingsInReview.filter((finding) => card.units.some((unit) => isOnUnit(finding, snapshotId, unit.id)))
    : [];

  const goTo = (nextIndex: number) => {
    position.update({ unit: cards[nextIndex]?.id ?? FOCUS_END, view: CARD_VIEWS.code });
  };

  const writeMarks = (marks: iUnitMarkChange[]) => {
    setMarks.mutate({ snapshotId, marks }, { onError: (error) => showToast(getErrorMessage(error)) });
  };

  const record = (current: iFocusCard, mark: UnitMark, findingId?: string) => {
    const previous = current.units.map((unit) => ({ unitId: unit.id, mark: unit.mark }));
    setHistory((steps) => [...steps, { cardId: current.id, previous, findingId }]);
    writeMarks(current.units.map((unit) => ({ unitId: unit.id, mark })));
    const decided = new Map(current.units.map((unit) => [unit.id, mark]));
    const nextIndex = findNextIndex(withMarks(cards, decided), index, position.queue);
    cardExit.run(UNIT_MARK_EXITS(mark), () => goTo(nextIndex));
  };

  const decide = (mark: typeof UNIT_MARKS.LOOKS_GOOD | typeof UNIT_MARKS.LATER) => {
    if (card) record(card, mark);
  };

  /** Writes the note as a finding on the card's units and moves on; resolves false when it could not be saved. */
  const comment = async (mark: CommentMark, body: string) => {
    if (!card) return false;
    try {
      const finding = await findings.create.mutateAsync({
        snapshotId,
        kind: mark === UNIT_MARKS.CONCERN ? FINDING_KINDS.CONCERN : FINDING_KINDS.QUESTION,
        body,
        anchors: card.units.map((unit) => ({ unitId: unit.id })),
      });
      showToast(`${mark === UNIT_MARKS.CONCERN ? 'Concern' : 'Question'} F-${finding.number} saved`);
      record(card, mark, finding.id);
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
    writeMarks(step.previous);
    if (step.findingId) {
      findings.remove.mutate({ findingId: step.findingId }, { onError: (error) => showToast(getErrorMessage(error)) });
    }
    position.update({ unit: step.cardId, view: CARD_VIEWS.code });
    showToast('Undone');
  };

  const move = (delta: number) => goTo(Math.min(cards.length, Math.max(0, index + delta)));

  return {
    snapshot,
    digest,
    changes,
    repositoryName: workspace?.name ?? snapshot.branch,
    openInEditor,
    cardFindings,
    findingsInReview,
    units,
    cards,
    index,
    card,
    progression: position.progression,
    queue: position.queue,
    view: position.view,
    setView: (view: typeof position.view) => position.update({ view }),
    setQueue: (queue: typeof position.queue) =>
      position.update({ queue, unit: cards[findNextIndex(cards, -1, queue)]?.id ?? FOCUS_END }),
    setProgression: (progression: ReviewProgression) =>
      position.update({ progression, unit: card?.units[0]?.id ?? null, view: CARD_VIEWS.code }),
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

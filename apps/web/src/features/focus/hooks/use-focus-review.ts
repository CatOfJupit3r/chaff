import { useMemo, useState } from 'react';

import { FINDING_KINDS, FINDING_SCOPES, UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { FindingSeverity, ReviewProgression, UnitMark } from '@chaff/common/enums/review.enums';

import { showToast } from '@~/components/toast/toast-store';
import { useChangeUnits } from '@~/features/change-units/hooks/use-change-units';
import { readyContent, orderByReading } from '@~/features/digests/digests.utils';
import { useDigest } from '@~/features/digests/hooks/use-digest';
import { isOnUnit } from '@~/features/findings/findings.utils';
import { useFindingMutations } from '@~/features/findings/hooks/use-finding-mutations';
import { useFindings } from '@~/features/findings/hooks/use-findings';
import { useStackFindings } from '@~/features/findings/hooks/use-stack-findings';
import { useOpenInEditor } from '@~/features/reviews/hooks/use-open-in-editor';
import { useSnapshot } from '@~/features/reviews/hooks/use-snapshot';
import type { iUnit } from '@~/features/reviews/reviews.types';
import { useSettings } from '@~/features/settings/hooks/use-settings';
import { useWorkspaces } from '@~/features/workspaces/hooks/use-workspaces';
import { getErrorMessage } from '@~/utils/rpc-errors';

import { buildFocusCards, FOCUS_END, findNextIndex, resolveIndex, withMarks } from '../focus-cards.utils';
import type { iFocusCard } from '../focus-cards.utils';
import { CARD_VIEWS, NOTE_SCOPES, UNIT_MARK_EXITS } from '../focus.enums';
import type { NoteScope } from '../focus.enums';
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

/** The marks that write a note first: a finding for a concern or question, the reason for a skip. */
export type NoteMark = typeof UNIT_MARKS.CONCERN | typeof UNIT_MARKS.QUESTION | typeof UNIT_MARKS.SKIPPED;

/** What a concern or question is about, and how much a concern matters. */
export interface iNoteOptions {
  scope: NoteScope;
  /** The units picked by hand, used when the scope is UNITS. */
  unitIds: readonly string[];
  severity?: FindingSeverity;
}

export const CARD_NOTE: iNoteOptions = { scope: NOTE_SCOPES.CARD, unitIds: [] };

interface iRecordOptions {
  findingId?: string;
  skipReason?: string;
  /** The units the mark goes on; the card's own units unless a note picked others. */
  marked?: readonly iUnit[];
}

/** The Focus review: which card is up, and the decisions that move through the cards. */
export function useFocusReview(snapshotId: string) {
  const snapshot = useSnapshot(snapshotId);
  const unitsInFileOrder = useUnits(snapshotId);
  const digest = useDigest(snapshotId);
  const changes = useChangeUnits(snapshotId, digest?.status);
  const readingOrder = readyContent(digest)?.readingOrder;
  const units = useMemo(() => orderByReading(unitsInFileOrder, readingOrder), [unitsInFileOrder, readingOrder]);
  const position = useFocusPosition();
  const { isContextPanelPinned } = useSettings();
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
  const stackFindings = useStackFindings(snapshotId);

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

  /** Marks the units and moves on when that decides the card; a note on other units keeps the card up. */
  const record = (current: iFocusCard, mark: UnitMark, options: iRecordOptions = {}) => {
    const { findingId, skipReason, marked = current.units } = options;
    const previous = marked.map((unit) => ({ unitId: unit.id, mark: unit.mark, skipReason: unit.skipReason }));
    setHistory((steps) => [...steps, { cardId: current.id, previous, findingId }]);
    if (marked.length > 0) writeMarks(marked.map((unit) => ({ unitId: unit.id, mark, skipReason })));
    if (!current.units.every((unit) => marked.some((candidate) => candidate.id === unit.id))) return;
    const decided = new Map(marked.map((unit) => [unit.id, mark]));
    const nextIndex = findNextIndex(withMarks(cards, decided), index, position.queue);
    cardExit.run(UNIT_MARK_EXITS(mark), () => goTo(nextIndex));
  };

  const decide = (mark: typeof UNIT_MARKS.LOOKS_GOOD | typeof UNIT_MARKS.LATER) => {
    if (card) record(card, mark);
  };

  /** The units a note goes on: the card's, the ones picked, or none for the whole branch or stack. */
  const notedUnits = (current: iFocusCard, { scope, unitIds }: iNoteOptions) => {
    if (scope === NOTE_SCOPES.CARD) return current.units;
    if (scope === NOTE_SCOPES.UNITS) return units.filter((unit) => unitIds.includes(unit.id));
    return [];
  };

  /**
   * Writes the note as a finding, or as the reason for skipping the card, and moves on when the card is
   * decided; resolves false when it could not be saved.
   */
  const comment = async (mark: NoteMark, body: string, options: iNoteOptions = CARD_NOTE) => {
    if (!card) return false;
    if (mark === UNIT_MARKS.SKIPPED) {
      record(card, mark, { skipReason: body.trim() });
      return true;
    }
    const isConcern = mark === UNIT_MARKS.CONCERN;
    const marked = notedUnits(card, options);
    try {
      const finding = await findings.create.mutateAsync({
        snapshotId,
        kind: isConcern ? FINDING_KINDS.CONCERN : FINDING_KINDS.QUESTION,
        severity: isConcern ? options.severity : undefined,
        scope: options.scope === NOTE_SCOPES.STACK ? FINDING_SCOPES.STACK : undefined,
        body,
        anchors: marked.map((unit) => ({ unitId: unit.id })),
      });
      showToast(`${isConcern ? 'Concern' : 'Question'} F-${finding.number} saved`);
      record(card, mark, { findingId: finding.id, marked });
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
    if (step.previous.length > 0) writeMarks(step.previous);
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
    /** The context panel opens with the review. */
    isContextPanelPinned,
    changes,
    repositoryName: workspace?.name ?? snapshot.branch,
    openInEditor,
    cardFindings,
    findingsInReview,
    branchFindings: findingsInReview.filter((finding) => finding.scope !== FINDING_SCOPES.CODE),
    stackFindings,
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
    openUnit: (unitId: string) => position.update({ unit: unitId, view: CARD_VIEWS.code }),
  };
}

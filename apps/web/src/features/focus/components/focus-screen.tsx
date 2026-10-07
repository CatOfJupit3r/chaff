import { useCallback, useState } from 'react';

import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';
import { UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { ChangeUnitsDialog } from '@~/features/change-units/components/change-units-dialog';
import { readyContent } from '@~/features/digests/digests.utils';
import { reportGuideAction } from '@~/features/onboarding/guide-action-events';
import { ReviewTopBar } from '@~/features/reviews/components/review-top-bar';
import { cn } from '@~/lib/utils';

import { cardMark, cardNoteMark } from '../focus-cards.utils';
import { countRegions, tallyMarks } from '../focus-queue.utils';
import { CARD_EXITS, CARD_VIEWS, FOCUS_QUEUES } from '../focus.enums';
import type { CardExit } from '../focus.enums';
import { useCodeExpansion } from '../hooks/use-code-expansion';
import { useFocusKeyboard } from '../hooks/use-focus-keyboard';
import { useFocusReview } from '../hooks/use-focus-review';
import type { iNoteOptions, NoteMark } from '../hooks/use-focus-review';
import { ChangeCard } from './change-card';
import { DecisionDock } from './decision-dock';
import { FocusContextPanel } from './focus-context-panel';
import { FocusEndCard } from './focus-end-card';
import { FocusHeader } from './focus-header';
import { FocusHints } from './focus-hints';
import { FocusLineNotes } from './focus-line-notes';
import { SecondPassBanner } from './second-pass-banner';
import { StackFindingsBanner } from './stack-findings-banner';
import { UnitCard } from './unit-card';

/** One card at a time, a change or a unit: read it, then decide with a key and move on. */
export function FocusScreen({ snapshotId }: { snapshotId: string }) {
  const focus = useFocusReview(snapshotId);
  const { snapshot, card } = focus;
  const unit = card && !card.change ? card.units[0] : undefined;
  const [isContextOpen, setIsContextOpen] = useState(focus.isContextPanelPinned);
  const [isEditingChanges, setIsEditingChanges] = useState(false);
  const [noteMark, setNoteMark] = useState<NoteMark>();
  const expansion = useCodeExpansion(card?.units.map((member) => member.id) ?? []);
  const closeDockNote = useCallback(() => setNoteMark(undefined), []);

  const saveNote = async (mark: NoteMark, body: string, options: iNoteOptions) => {
    const isSaved = await focus.comment(mark, body, options);
    if (isSaved) setNoteMark(undefined);
    return isSaved;
  };
  const swipe = (side: CardExit) =>
    side === CARD_EXITS.RIGHT ? focus.decide(UNIT_MARKS.LOOKS_GOOD) : setNoteMark(UNIT_MARKS.CONCERN);
  const setContextOpen = (isOpen: boolean) => {
    if (isOpen && !isContextOpen) reportGuideAction(ONBOARDING_ITEMS.CONTEXT);
    setIsContextOpen(isOpen);
  };
  const jump = (index: number) => {
    setNoteMark(undefined);
    focus.goTo(index);
  };

  useFocusKeyboard({
    hasCard: card !== undefined,
    onLooksGood: () => focus.decide(UNIT_MARKS.LOOKS_GOOD),
    onLater: () => focus.decide(UNIT_MARKS.LATER),
    onComment: setNoteMark,
    onMove: (delta) => {
      setNoteMark(undefined);
      focus.move(delta);
    },
    onUndo: focus.undo,
    onToggleContext: () => setContextOpen(!isContextOpen),
    onExpand: () => {
      focus.setView(CARD_VIEWS.code);
      expansion.toggle();
    },
    onEscape: () => setIsContextOpen(false),
    onView: focus.setView,
  });

  return (
    <>
      <ReviewTopBar snapshot={snapshot} repositoryName={focus.repositoryName} />
      <div
        className={cn(
          'grid min-h-0 flex-1 transition-[grid-template-columns] duration-250',
          isContextOpen ? 'grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-[minmax(0,1fr)_0px]',
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex min-h-0 min-w-0 flex-1 scrollbar-gutter-stable flex-col items-center overflow-auto px-6 pt-[18px] pb-7">
            <FocusHeader
              cards={focus.cards}
              index={focus.index}
              progression={focus.progression}
              queue={focus.queue}
              canUndo={focus.canUndo}
              isContextOpen={isContextOpen}
              onMove={focus.move}
              onJump={jump}
              onUndo={focus.undo}
              onToggleContext={() => setContextOpen(!isContextOpen)}
              onLeaveQueue={() => focus.setQueue(FOCUS_QUEUES.open)}
              onProgression={focus.setProgression}
            />
            <SecondPassBanner
              snapshot={snapshot}
              units={focus.units}
              findings={focus.findingsInReview}
              onRecheck={() => focus.setQueue(FOCUS_QUEUES.recheck)}
            />
            <StackFindingsBanner findings={focus.stackFindings} onShow={() => setContextOpen(true)} />
            <div className="relative w-full max-w-[920px]">
              <div className="absolute inset-x-[22px] top-[-7px] h-[30px] rounded-t-xl border border-b-0 border-line bg-surface opacity-55" />
              <div className="absolute inset-x-[44px] top-[-13px] h-[30px] rounded-t-xl border border-b-0 border-line bg-surface opacity-30" />
              {card ? (
                <FocusLineNotes
                  key={card.id}
                  snapshot={snapshot}
                  findings={focus.findingsInReview}
                  onSaved={focus.recordLineNote}
                  onDraft={closeDockNote}
                >
                  {card.change ? (
                    <ChangeCard
                      key={card.id}
                      snapshot={snapshot}
                      card={card}
                      findings={focus.cardFindings}
                      digest={focus.digest}
                      view={focus.view}
                      exit={focus.exit}
                      onViewChange={focus.setView}
                      onOpenInEditor={focus.openInEditor}
                      onOpenUnit={focus.openUnit}
                      onEdit={() => setIsEditingChanges(true)}
                      onSwipe={swipe}
                    />
                  ) : null}
                  {unit ? (
                    <UnitCard
                      key={unit.id}
                      snapshot={snapshot}
                      unit={unit}
                      findings={focus.cardFindings}
                      digest={focus.digest}
                      view={focus.view}
                      exit={focus.exit}
                      onViewChange={focus.setView}
                      onOpenInEditor={focus.openInEditor}
                      onOpenUnit={focus.openUnit}
                      onSwipe={swipe}
                    />
                  ) : null}
                </FocusLineNotes>
              ) : null}
              {card ? null : (
                <FocusEndCard
                  snapshot={snapshot}
                  tally={tallyMarks(focus.units)}
                  regions={countRegions(focus.units)}
                  queue={focus.queue}
                  onQueue={focus.setQueue}
                />
              )}
            </div>
            <FocusHints />
          </div>
          {card ? (
            <DecisionDock
              mark={cardMark(card)}
              hasNote={cardNoteMark(card) !== undefined}
              noteMark={noteMark}
              headSha={snapshot.headSha}
              isSaving={focus.isSaving}
              noteSource={{
                units: focus.units,
                files: snapshot.files,
                cardUnitIds: card.units.map((member) => member.id),
              }}
              onComment={setNoteMark}
              onCancelNote={() => setNoteMark(undefined)}
              onSaveNote={saveNote}
              onLooksGood={() => focus.decide(UNIT_MARKS.LOOKS_GOOD)}
              onLater={() => focus.decide(UNIT_MARKS.LATER)}
            />
          ) : null}
        </div>
        <aside
          aria-label="Context"
          className={cn('min-w-0 overflow-x-hidden overflow-y-auto bg-canvas', isContextOpen && 'border-l border-line')}
        >
          {isContextOpen ? (
            <FocusContextPanel
              cards={focus.cards}
              index={focus.index}
              progression={focus.progression}
              findings={focus.cardFindings}
              branchFindings={focus.branchFindings}
              stackFindings={focus.stackFindings}
              digest={focus.digest}
              onJump={jump}
              onEditChanges={() => setIsEditingChanges(true)}
              onClose={() => setIsContextOpen(false)}
            />
          ) : null}
        </aside>
      </div>
      <ChangeUnitsDialog
        snapshotId={snapshotId}
        units={focus.units}
        files={snapshot.files}
        changes={focus.changes}
        hasDigest={readyContent(focus.digest) !== undefined}
        isOpen={isEditingChanges}
        onOpenChange={setIsEditingChanges}
      />
    </>
  );
}

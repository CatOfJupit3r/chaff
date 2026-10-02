import { useState } from 'react';

import { UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { ReviewTopBar } from '@~/features/reviews/components/review-top-bar';
import { cn } from '@~/lib/utils';

import { tallyMarks } from '../focus-queue.utils';
import { FOCUS_QUEUES } from '../focus.enums';
import { useFocusKeyboard } from '../hooks/use-focus-keyboard';
import { useFocusReview } from '../hooks/use-focus-review';
import type { CommentMark } from '../hooks/use-focus-review';
import { DecisionDock } from './decision-dock';
import { FocusContextPanel } from './focus-context-panel';
import { FocusEndCard } from './focus-end-card';
import { FocusHeader } from './focus-header';
import { FocusHints } from './focus-hints';
import { SecondPassBanner } from './second-pass-banner';
import { UnitCard } from './unit-card';

/** One unit at a time: read it, then decide with a key and move on. */
export function FocusScreen({ snapshotId }: { snapshotId: string }) {
  const focus = useFocusReview(snapshotId);
  const { snapshot, unit, unitFindings } = focus;
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [noteMark, setNoteMark] = useState<CommentMark>();

  const saveNote = async (mark: CommentMark, body: string) => {
    const isSaved = await focus.comment(mark, body);
    if (isSaved) setNoteMark(undefined);
    return isSaved;
  };
  const jump = (index: number) => {
    setNoteMark(undefined);
    focus.goTo(index);
  };

  useFocusKeyboard({
    hasCard: unit !== undefined,
    onLooksGood: () => focus.decide(UNIT_MARKS.LOOKS_GOOD),
    onLater: () => focus.decide(UNIT_MARKS.LATER),
    onComment: setNoteMark,
    onMove: (delta) => {
      setNoteMark(undefined);
      focus.move(delta);
    },
    onUndo: focus.undo,
    onToggleContext: () => setIsContextOpen((isOpen) => !isOpen),
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
              units={focus.units}
              index={focus.index}
              queue={focus.queue}
              canUndo={focus.canUndo}
              isContextOpen={isContextOpen}
              onMove={focus.move}
              onJump={jump}
              onUndo={focus.undo}
              onToggleContext={() => setIsContextOpen((isOpen) => !isOpen)}
              onLeaveQueue={() => focus.setQueue(FOCUS_QUEUES.open)}
            />
            <SecondPassBanner
              snapshot={snapshot}
              units={focus.units}
              findings={focus.findingsInReview}
              onRecheck={() => focus.setQueue(FOCUS_QUEUES.recheck)}
            />
            <div className="relative w-full max-w-[920px]">
              <div className="absolute inset-x-[22px] top-[-7px] h-[30px] rounded-t-xl border border-b-0 border-line bg-surface opacity-55" />
              <div className="absolute inset-x-[44px] top-[-13px] h-[30px] rounded-t-xl border border-b-0 border-line bg-surface opacity-30" />
              {unit ? (
                <UnitCard
                  key={unit.id}
                  snapshot={snapshot}
                  unit={unit}
                  findings={unitFindings}
                  digest={focus.digest}
                  view={focus.view}
                  exit={focus.exit}
                  onViewChange={focus.setView}
                  onOpenInEditor={focus.openInEditor}
                />
              ) : (
                <FocusEndCard
                  snapshot={snapshot}
                  tally={tallyMarks(focus.units)}
                  queue={focus.queue}
                  onQueue={focus.setQueue}
                />
              )}
            </div>
            <FocusHints />
          </div>
          {unit ? (
            <DecisionDock
              mark={unit.mark}
              noteMark={noteMark}
              headSha={snapshot.headSha}
              isSaving={focus.isSaving}
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
              units={focus.units}
              index={focus.index}
              findings={unitFindings}
              digest={focus.digest}
              onJump={jump}
              onClose={() => setIsContextOpen(false)}
            />
          ) : null}
        </aside>
      </div>
    </>
  );
}

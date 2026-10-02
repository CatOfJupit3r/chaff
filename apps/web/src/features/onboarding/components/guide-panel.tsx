import { useId } from 'react';

import { ONBOARDING_STATUSES } from '@chaff/common/enums/onboarding.enums';

import { DownIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';

import type { OnboardingGuideController } from '../hooks/use-onboarding-guide';
import { GuideChecklist } from './guide-checklist';
import { GuideMenu } from './guide-menu';
import { GuideDone, GuideWelcome } from './guide-panel-states';
import { GuideProgressBar } from './guide-progress';

interface iGuidePanelProps {
  guide: OnboardingGuideController;
  onCollapse: () => void;
}

/** The expanded checklist: a welcome on first run, the items by area, or the finished state. */
export function GuidePanel({ guide, onCollapse }: iGuidePanelProps) {
  const titleId = useId();
  const isWelcome = guide.state.status === ONBOARDING_STATUSES.NOT_STARTED && !guide.isFinishShown;

  return (
    <section
      aria-labelledby={titleId}
      className="pointer-events-auto flex max-h-[380px] min-h-0 w-full flex-col overflow-hidden rounded-lg border border-line-strong bg-surface text-fg shadow-dock"
    >
      <div className="flex flex-none items-center gap-2 py-2 pr-2 pl-3.5">
        <h2 id={titleId} className="m-0 text-[13px] font-semibold">
          Getting started
        </h2>
        <span className="font-mono text-[11.5px] text-muted tabular-nums">
          {guide.doneCount} of {guide.totalCount}
        </span>
        <span className="flex-1" />
        {guide.isFinishShown ? null : <GuideMenu onSkip={guide.skip} />}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Collapse getting started"
          aria-expanded="true"
          title="Collapse"
          className="size-[26px]"
          onClick={onCollapse}
        >
          <DownIcon />
        </Button>
      </div>
      <GuideProgressBar doneCount={guide.doneCount} totalCount={guide.totalCount} />
      <div className="min-h-0 overflow-y-auto">
        {isWelcome ? <GuideWelcome onStart={guide.start} onSkip={guide.skip} /> : null}
        {guide.isFinishShown ? <GuideDone onClose={guide.finish} /> : null}
        {isWelcome || guide.isFinishShown ? null : (
          <GuideChecklist completed={guide.state.completedItems} onShowMe={guide.tip.showMe} />
        )}
      </div>
    </section>
  );
}

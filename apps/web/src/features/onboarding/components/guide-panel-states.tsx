import { CheckIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';

interface iGuideWelcomeProps {
  onStart: () => void;
  onSkip: () => void;
}

/** First run: what the checklist is for, with Start and Skip guide. */
export function GuideWelcome({ onStart, onSkip }: iGuideWelcomeProps) {
  return (
    <div className="flex flex-col gap-2 px-3.5 pt-3 pb-3.5">
      <p className="m-0 text-[14px] font-medium tracking-[-0.01em]">Learn Chaff on one of your own changes</p>
      <p className="m-0 text-[12.5px] leading-relaxed text-muted">
        Each item checks itself off when you do it, in any order. Show me points at the control when you want a hand.
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={onStart}>
          Start
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip guide
        </Button>
      </div>
    </div>
  );
}

/** Every counted item is done. */
export function GuideDone({ onClose }: { onClose: () => unknown }) {
  return (
    <div className="flex flex-col items-start gap-2 px-3.5 pt-3 pb-3.5">
      <span className="grid size-7 place-items-center rounded-full bg-good-soft text-good">
        <CheckIcon className="size-4" />
      </span>
      <p className="m-0 text-[14px] font-medium tracking-[-0.01em]">You&apos;re set</p>
      <p className="m-0 text-[12.5px] leading-relaxed text-muted">
        You have tried every part of a review. Replay the guide from Settings any time.
      </p>
      <Button size="sm" className="mt-1.5" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}

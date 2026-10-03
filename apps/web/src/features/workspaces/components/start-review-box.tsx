import { useState } from 'react';

import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';

import { LinkIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';

import { useOpenReviewLink } from '../hooks/use-open-review-link';
import type { iWorkspace } from '../workspaces.types';

/** One box that starts a review from whatever the reviewer has at hand: a link, a number or a branch. */
export function StartReviewBox({ workspaces }: { workspaces: readonly iWorkspace[] }) {
  const [text, setText] = useState('');
  const { open, isOpening } = useOpenReviewLink(workspaces);
  const isEmpty = text.trim().length === 0;

  return (
    <form
      data-onboarding={ONBOARDING_ITEMS.START_REVIEW}
      className="flex items-center gap-2.5 rounded-lg border border-line-strong bg-surface py-1.5 pr-1.5 pl-3.5 focus-within:border-accent-line"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isEmpty) open(text);
      }}
    >
      <LinkIcon className="size-4 flex-none text-faint" />
      <input
        aria-label="Start a review"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Paste an MR link, !iid, or a local branch to start a review"
        className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[13px] text-fg outline-none placeholder:text-faint"
      />
      <Button type="submit" variant="primary" size="sm" disabled={isEmpty || isOpening}>
        Start review
      </Button>
    </form>
  );
}

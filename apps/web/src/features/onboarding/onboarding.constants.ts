import {
  ONBOARDING_ITEMS,
  ONBOARDING_SCREENS,
  onboardingItemsEnumwaii,
  onboardingScreensEnumwaii,
} from '@chaff/common/enums/onboarding.enums';

import { ONBOARDING_GROUPS } from './onboarding.enums';
import type { iOnboardingItemGuide } from './onboarding.types';

export const ONBOARDING_ITEM_GUIDES = onboardingItemsEnumwaii.derive<iOnboardingItemGuide>()(
  [
    ONBOARDING_ITEMS.ADD_REPOSITORY,
    {
      group: ONBOARDING_GROUPS.START,
      screen: ONBOARDING_SCREENS.REVIEWS,
      title: 'Add a repository',
      tip: 'Add repository points Chaff at a Git repository on this computer. Chaff only reads it and keeps reviews in its own store.',
    },
  ],
  [
    ONBOARDING_ITEMS.START_REVIEW,
    {
      group: ONBOARDING_GROUPS.START,
      screen: ONBOARDING_SCREENS.REVIEWS,
      title: 'Start a review of your own change',
      tip: 'Choose a stack in the sidebar, select a branch, then press Start review. Start a review also accepts a merge or pull request link or a branch name. The change is frozen so your decisions survive a rebase.',
      missing: 'Add a repository first. The start box appears once Chaff knows one.',
    },
  ],
  [
    ONBOARDING_ITEMS.DIGEST,
    {
      group: ONBOARDING_GROUPS.READ,
      screen: ONBOARDING_SCREENS.FOCUS,
      title: 'Run the AI digest',
      tip: 'AI digest asks your coding agent to summarize the change, group it and draw diagrams. It runs while you keep reading.',
      alsoOn: [ONBOARDING_SCREENS.FULL_DIFF, ONBOARDING_SCREENS.EXPORT],
    },
  ],
  [
    ONBOARDING_ITEMS.DIAGRAM,
    {
      group: ONBOARDING_GROUPS.READ,
      screen: ONBOARDING_SCREENS.FOCUS,
      title: 'Open a diagram or usages',
      tip: 'These tabs show where a unit is used and, after a digest, how it connects to the rest. Keys 1 to 4 switch them.',
      missing: 'The tabs sit under each card. Go back to a card to see them.',
    },
  ],
  [
    ONBOARDING_ITEMS.CONTEXT,
    {
      group: ONBOARDING_GROUPS.READ,
      screen: ONBOARDING_SCREENS.FOCUS,
      title: 'Open Context and the outline',
      tip: 'Context shows the digest overview, the notes so far and every card in order, so you can jump between them.',
    },
  ],
  [
    ONBOARDING_ITEMS.WHOLE_FILE,
    {
      group: ONBOARDING_GROUPS.READ,
      screen: ONBOARDING_SCREENS.FOCUS,
      title: 'Read the whole file',
      tip: 'Whole file shows every line around the change, with the change still marked.',
      missing: 'Whole file is on function and section cards. Switch Progression to Functions to find it.',
    },
  ],
  [
    ONBOARDING_ITEMS.PROGRESSION,
    {
      group: ONBOARDING_GROUPS.READ,
      screen: ONBOARDING_SCREENS.FOCUS,
      title: 'Switch progression or edit changes',
      tip: 'Progression walks the review by changes, functions or sections. In Changes, Edit changes lets you regroup the units.',
    },
  ],
  [
    ONBOARDING_ITEMS.LOOKS_GOOD,
    {
      group: ONBOARDING_GROUPS.DECIDE,
      screen: ONBOARDING_SCREENS.FOCUS,
      title: 'Mark a card Looks good',
      tip: 'Looks good records that you are happy with the card and moves on. Undo takes it back.',
      missing: 'Decisions sit under each card. Go back to a card to make one.',
      alsoOn: [ONBOARDING_SCREENS.FULL_DIFF],
    },
  ],
  [
    ONBOARDING_ITEMS.LATER,
    {
      group: ONBOARDING_GROUPS.DECIDE,
      screen: ONBOARDING_SCREENS.FOCUS,
      title: 'Leave a card for Later',
      tip: 'Later puts a card aside so you can come back with more context. The end of Focus walks the Later cards again.',
      missing: 'Decisions sit under each card. Go back to a card to make one.',
    },
  ],
  [
    ONBOARDING_ITEMS.SKIP,
    {
      group: ONBOARDING_GROUPS.DECIDE,
      screen: ONBOARDING_SCREENS.FOCUS,
      title: 'Skip a card with a reason',
      tip: 'Skip closes a card that needs no review, such as a lockfile, and keeps the reason you give.',
      missing: 'Decisions sit under each card. Go back to a card to make one.',
      alsoOn: [ONBOARDING_SCREENS.FULL_DIFF],
    },
  ],
  [
    ONBOARDING_ITEMS.NOTE,
    {
      group: ONBOARDING_GROUPS.NOTE,
      screen: ONBOARDING_SCREENS.FOCUS,
      title: 'Write a concern or question',
      tip: 'Concern and Question open a note about the card, some units, the branch or the stack. Saved notes become findings.',
      missing: 'Notes start from a card. Go back to a card to write one.',
      alsoOn: [ONBOARDING_SCREENS.FULL_DIFF],
    },
  ],
  [
    ONBOARDING_ITEMS.FINDINGS,
    {
      group: ONBOARDING_GROUPS.NOTE,
      screen: ONBOARDING_SCREENS.FINDINGS,
      title: 'Set a severity or suggest a task',
      tip: 'Pick a finding to say how serious it is, or ask your coding agent to suggest a task that fixes it.',
      missing: 'Findings appear here after you save a concern or question. Pick one to see its actions.',
    },
  ],
  [
    ONBOARDING_ITEMS.FULL_DIFF,
    {
      group: ONBOARDING_GROUPS.HAND_OFF,
      screen: ONBOARDING_SCREENS.ANYWHERE,
      title: 'Open the Full diff',
      tip: 'Diff shows every changed file in one place, with file decisions and inline notes.',
      missing: 'Start a review first. Diff appears in the rail once a review is open.',
    },
  ],
  [
    ONBOARDING_ITEMS.OUTPUT,
    {
      group: ONBOARDING_GROUPS.HAND_OFF,
      screen: ONBOARDING_SCREENS.EXPORT,
      title: 'Export or copy an output',
      tip: 'Export turns your findings into Markdown, JSON or an agent prompt. Copy it, or post it to the merge request.',
    },
  ],
  [
    ONBOARDING_ITEMS.JUMP,
    {
      group: ONBOARDING_GROUPS.MAKE_IT_YOURS,
      screen: ONBOARDING_SCREENS.ANYWHERE,
      title: 'Open Jump to',
      tip: 'Jump to finds units, files, reviews and screens. Press / or Ctrl+K from anywhere.',
    },
  ],
  [
    ONBOARDING_ITEMS.KEY_LIST,
    {
      group: ONBOARDING_GROUPS.MAKE_IT_YOURS,
      screen: ONBOARDING_SCREENS.ANYWHERE,
      title: 'Open the key list',
      tip: 'Press ? anywhere outside a text field to see every key as you have bound it.',
    },
  ],
  [
    ONBOARDING_ITEMS.CUSTOMIZE,
    {
      group: ONBOARDING_GROUPS.MAKE_IT_YOURS,
      screen: ONBOARDING_SCREENS.ANYWHERE,
      title: 'Change appearance or a key',
      tip: 'Appearance sets the theme, accent and code font. Settings lets you rebind the Focus and Verify keys.',
      alsoOn: [ONBOARDING_SCREENS.SETTINGS],
    },
  ],
  [
    ONBOARDING_ITEMS.SECOND_PASS,
    {
      group: ONBOARDING_GROUPS.LATER,
      screen: ONBOARDING_SCREENS.FOCUS,
      title: 'Review a second pass',
      tip: 'Update freezes the branch again and marks what changed since your decisions.',
      unlock: 'Unlocks when a branch you reviewed gets new commits.',
    },
  ],
  [
    ONBOARDING_ITEMS.VERIFY,
    {
      group: ONBOARDING_GROUPS.LATER,
      screen: ONBOARDING_SCREENS.FINDINGS,
      title: 'Verify a fix',
      tip: 'Verify confirms that a fix really addresses the finding.',
      unlock: 'Unlocks when a finding has a fix to check.',
    },
  ],
  [
    ONBOARDING_ITEMS.NEXT_BRANCH,
    {
      group: ONBOARDING_GROUPS.LATER,
      screen: ONBOARDING_SCREENS.FOCUS,
      title: 'Continue to the next branch',
      tip: 'At the end of Focus, Next in the stack opens the branch stacked on this one.',
      unlock: 'Unlocks when another branch is stacked on yours.',
    },
  ],
  [
    ONBOARDING_ITEMS.HISTORY,
    {
      group: ONBOARDING_GROUPS.LATER,
      screen: ONBOARDING_SCREENS.HISTORY,
      title: 'Return to an earlier review',
      tip: 'History keeps earlier snapshots, decisions and findings, archived reviews included.',
      unlock: 'Unlocks once you have reviews to look back on.',
    },
  ],
);

export const ONBOARDING_SCREEN_LABELS = onboardingScreensEnumwaii.derive(
  [ONBOARDING_SCREENS.REVIEWS, 'Reviews'],
  [ONBOARDING_SCREENS.FOCUS, 'Focus'],
  [ONBOARDING_SCREENS.FULL_DIFF, 'Full diff'],
  [ONBOARDING_SCREENS.FINDINGS, 'Findings'],
  [ONBOARDING_SCREENS.EXPORT, 'Export'],
  [ONBOARDING_SCREENS.HISTORY, 'History'],
  [ONBOARDING_SCREENS.SETTINGS, 'Settings'],
  [ONBOARDING_SCREENS.ANYWHERE, 'Anywhere'],
);

export const GUIDE_NEEDS_REVIEW = 'Start a review first. This is on the review screens.';

export const GUIDE_SIZES = { tipWidth: 288, tipHeight: 150, gap: 12, edge: 16 };

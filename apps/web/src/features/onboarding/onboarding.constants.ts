import { ONBOARDING_STEPS } from '@chaff/common/enums/onboarding.enums';

import { ONBOARDING_SCREENS } from './onboarding.enums';
import type { iOnboardingStep } from './onboarding.types';

export const HOSTED_STACK_GUIDE = {
  description:
    'Merge requests and pull requests are grouped by their branch dependencies here. Follow the parent change before its dependent requests, and use Start or Continue to review each change.',
  fallback: { selector: '[aria-label="Stack navigation"]' },
  unavailable: 'This change may be outside the current inbox filter; change the filter to find its stack.',
} satisfies Pick<iOnboardingStep, 'description' | 'fallback' | 'unavailable'>;

export const ONBOARDING_GUIDE: readonly iOnboardingStep[] = [
  {
    id: ONBOARDING_STEPS.CHOOSE_CHANGE,
    screen: ONBOARDING_SCREENS.REVIEWS,
    title: 'Pick a change of your own',
    description:
      'Add a repository, choose a stack in the sidebar, then select a branch. Merge and pull request titles appear on their branches. Start a review also accepts a link or branch name.',
    anchor: { selector: '[aria-label="Stack navigation"]' },
    fallback: { text: 'Add repository' },
    unavailable: 'Use Add repository to choose a local Git repository first.',
  },
  {
    id: ONBOARDING_STEPS.START_REVIEW,
    screen: ONBOARDING_SCREENS.REVIEWS,
    title: 'Start your review',
    description:
      'Paste a merge or pull request URL, or enter a branch name and choose its repository. Start review freezes the change so your decisions survive rebases; the guide continues when it opens.',
    anchor: { text: 'Start review' },
    prepare: { text: 'Start a review' },
    fallback: { text: 'Add repository' },
    unavailable: 'Add a repository first, then start a review of a real change.',
  },
  {
    id: ONBOARDING_STEPS.REVIEW_SWITCHER,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Switch between reviews',
    description:
      'This menu opens another started review in the same repository. Your decisions and findings stay with each review.',
    anchor: { selector: '[aria-label="Switch review"]' },
  },
  {
    id: ONBOARDING_STEPS.STACK,
    screen: ONBOARDING_SCREENS.STACK,
    title: 'Follow the stack',
    description:
      'Select a branch to see its progress and findings, then review its own changes or compare cumulatively from the base. Work through parents before their dependent branches.',
    anchor: { selector: '[data-onboarding-stack]' },
  },
  {
    id: ONBOARDING_STEPS.DIGEST,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Get an AI digest',
    description:
      'Run your configured coding agent to summarize this change and suggest groups, diagrams, and related context. Open Context to read the overview and ordered outline of review cards.',
    anchor: { selector: '[data-onboarding-digest] button, [data-onboarding-digest] span' },
    action: { text: 'Write digest' },
  },
  {
    id: ONBOARDING_STEPS.DIAGRAM,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Explore the diagram',
    description:
      'Diagram shows relationships the digest found; linked units let you follow the code. Usages and Tests offer other context, and keys 1 through 4 switch these views.',
    anchor: { text: 'Diagram', selector: '[role="tab"]' },
    action: { text: 'Diagram', selector: '[role="tab"]' },
    unavailable: 'Diagrams appear when the coding agent provides them for this card.',
  },
  {
    id: ONBOARDING_STEPS.FOCUS,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Review one card at a time',
    description:
      'Focus keeps one change or unit in view so you can read it and decide. Use the arrows or progress bar to move through the cards.',
    anchor: { selector: '[data-onboarding-card]' },
    prepare: { text: 'Code', selector: '[role="tab"]' },
  },
  {
    id: ONBOARDING_STEPS.ACCEPT,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Accept a card',
    description:
      'Looks good records your decision and moves to the next card. Use it only when you are happy with the change, or press Next to keep exploring the guide.',
    anchor: { text: 'Looks good' },
    fallback: { selector: '[aria-label="Previous card"]' },
    unavailable: 'Use Previous card to return to a card, or Next to keep exploring the guide.',
  },
  {
    id: ONBOARDING_STEPS.LATER,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Leave a card for later',
    description:
      'Later puts the card aside so you can return with more context. Undo restores the previous decision if you change your mind.',
    anchor: { text: 'Later' },
    fallback: { selector: '[aria-label="Previous card"]' },
    unavailable: 'Use Previous card to return to a card, or Next to keep exploring the guide.',
  },
  {
    id: ONBOARDING_STEPS.SKIP_CARD,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Skip a card with a reason',
    description:
      'Skip opens a note so you can explain why this card does not need review. This decision is saved with the review; Skip guide below ends only the guide.',
    anchor: { text: 'Skip' },
    fallback: { selector: '[aria-label="Previous card"]' },
    unavailable: 'Use Previous card to return to a card, or Next to keep exploring the guide.',
  },
  {
    id: ONBOARDING_STEPS.COMMENT,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Write a concern or question',
    description:
      'Concern and Question open a note composer; choose a severity for concerns. Scope the note to this card, selected units, the whole branch, or the whole stack before saving.',
    anchor: { text: 'Concern' },
    fallback: { selector: '[aria-label="Previous card"]' },
    unavailable: 'Use Previous card to return to a card, or Next to keep exploring the guide.',
  },
  {
    id: ONBOARDING_STEPS.CONTEXT,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Open context and the outline',
    description:
      'Context contains the digest overview, the ordered card outline, and findings. Jump to a card here, or expand unchanged code around a change to understand it.',
    anchor: { selector: 'aside[aria-label="Context"]' },
    prepare: { text: 'Context' },
  },
  {
    id: ONBOARDING_STEPS.WHOLE_FILE,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Read the whole file',
    description:
      'Whole file expands the surrounding code while keeping changes marked. Open in editor and Open in diff take you to another view of this same change.',
    anchor: { text: 'Whole file' },
    prepare: { selector: '[aria-label="Progression"] button', text: 'Functions' },
    fallback: { selector: '[aria-label="Progression"]' },
    action: { text: 'Whole file' },
    unavailable:
      'Choose Functions or Sections in Progression to open a code unit; binary and oversized files may have no expandable code.',
  },
  {
    id: ONBOARDING_STEPS.SWIPE,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Use touch or keyboard',
    description:
      'Swipe right with a finger or pen to accept, or left to open a concern. The hints show your current keys; arrow keys move between cards.',
    anchor: { selector: '[data-onboarding-card]' },
  },
  {
    id: ONBOARDING_STEPS.UNITS,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Organize units into changes',
    description:
      'Progression switches between Changes, Functions, and Sections. In the Changes outline, Edit changes lets you name, reorder, merge, or ungroup units, or adopt digest grouping.',
    anchor: { selector: '[aria-label="Progression"]' },
    prepare: { text: 'Context' },
  },
  {
    id: ONBOARDING_STEPS.FULL_DIFF,
    screen: ONBOARDING_SCREENS.DIFF,
    title: 'Read the full diff',
    description:
      'Browse changed files individually or together, switch unified and split layouts, and adjust wrapping or the file list width. Record file decisions, add inline notes, or return to Focus.',
    anchor: { selector: '[data-onboarding-diff]' },
  },
  {
    id: ONBOARDING_STEPS.FINDINGS,
    screen: ONBOARDING_SCREENS.FINDINGS,
    title: 'Work through findings',
    description:
      'Select a finding to inspect its scope and severity: Minor, Major, or Blocking. Suggest a task asks your coding agent for a concrete fix you can edit and accept for export.',
    anchor: { selector: '[data-onboarding-findings]' },
    unavailable: 'Findings appear after you save a concern or question during your review.',
  },
  {
    id: ONBOARDING_STEPS.SECOND_PASS,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Review a second pass',
    description:
      'When the branch changes, Update freezes another snapshot and keeps prior decisions. The second pass highlights edited, new, and possibly affected units so you can Recheck them.',
    anchor: { selector: '[aria-label="Second pass"]' },
    fallback: { selector: '[data-onboarding-snapshot]' },
    unavailable: 'This is the first snapshot; the second pass appears after the branch changes and you use Update.',
  },
  {
    id: ONBOARDING_STEPS.VERIFY,
    screen: ONBOARDING_SCREENS.FINDINGS,
    title: 'Verify the fixes',
    description:
      'After a fix, select the finding and use its available lifecycle actions to verify it against the code. Verify keys follow the bindings shown in the keyboard list.',
    anchor: { text: 'Verify' },
    fallback: { selector: '[data-onboarding-findings]' },
    action: { text: 'Verify' },
    unavailable: 'Verify becomes available when a finding reaches the appropriate state after a fix.',
  },
  {
    id: ONBOARDING_STEPS.EXPORT,
    screen: ONBOARDING_SCREENS.EXPORT,
    title: 'Choose what to hand off',
    description:
      'Choose the scope, finding states, and attachments for your export. Accepted suggested tasks travel with the findings; Fix with agent can run a coding agent in its own checkout.',
    anchor: { selector: '[data-onboarding-export-options]' },
  },
  {
    id: ONBOARDING_STEPS.OUTPUT,
    screen: ONBOARDING_SCREENS.EXPORT,
    title: 'Choose your output',
    description:
      'Copy Markdown, JSON, or an agent prompt, or import an agent report back. Hosted reviews also offer GitLab private draft notes or one GitHub private pending review, plus CLI output; review the confirmation before posting.',
    anchor: { selector: '[data-onboarding-output]' },
  },
  {
    id: ONBOARDING_STEPS.NEXT_BRANCH,
    screen: ONBOARDING_SCREENS.REVIEW,
    title: 'Continue to the next branch',
    description:
      'At the end of Focus, Next in the stack opens the next dependent branch. Each branch keeps its own decisions while stack findings carry the wider context.',
    anchor: { selector: '[data-onboarding-next-branch]' },
    fallback: { selector: '[data-onboarding-card]' },
    unavailable:
      'This control appears at the end of the cards when another dependent branch exists; Stack also lets you choose it.',
  },
  {
    id: ONBOARDING_STEPS.HISTORY,
    screen: ONBOARDING_SCREENS.HISTORY,
    title: 'Return to earlier reviews',
    description:
      'History keeps previous snapshots, decisions, and findings, including archived reviews. Open a row to revisit the frozen code.',
    anchor: { selector: '[data-onboarding-history]' },
  },
  {
    id: ONBOARDING_STEPS.JUMP,
    screen: ONBOARDING_SCREENS.HISTORY,
    title: 'Jump to anything',
    description:
      'Jump to searches units, files, reviews, branches, and screens. Use / or Ctrl+K, then arrows and Enter to open a result.',
    anchor: { selector: '[data-onboarding-jump]' },
    action: { selector: '[role="dialog"] button[aria-label="Close"]' },
  },
  {
    id: ONBOARDING_STEPS.KEY_LIST,
    screen: ONBOARDING_SCREENS.HISTORY,
    title: 'Keep the keys handy',
    description:
      'Press ? to open the keyboard list and see your current bindings. Esc closes dialogs and context during normal use; while this guide is open, Esc skips the guide.',
    anchor: { selector: '[data-onboarding-keys]' },
    unavailable: 'Press ? to open the real keyboard list.',
  },
  {
    id: ONBOARDING_STEPS.APPEARANCE,
    screen: ONBOARDING_SCREENS.SETTINGS,
    title: 'Make it comfortable',
    description:
      'Appearance offers light, dark, or system theme and an accent color. You can also adjust code font, size, line height, density, and syntax colors.',
    anchor: { selector: '[aria-label="Appearance"]' },
    action: { selector: '[role="dialog"] button[aria-label="Close"]' },
  },
  {
    id: ONBOARDING_STEPS.CUSTOMIZATION,
    screen: ONBOARDING_SCREENS.SETTINGS,
    title: 'Set your review defaults',
    description:
      'Settings saves diff layout, context, whitespace display, progression, and project preferences on this computer. Tune them to suit how you read code.',
    anchor: { selector: '[data-onboarding-customization]' },
  },
  {
    id: ONBOARDING_STEPS.AGENTS,
    screen: ONBOARDING_SCREENS.SETTINGS,
    title: 'Configure your coding agents',
    description:
      'Set the Claude Code or Codex command or executable path, and choose your default agent. These agents power digests, suggested tasks, and fixes.',
    anchor: { selector: 'section[aria-label="Coding agents"]' },
  },
  {
    id: ONBOARDING_STEPS.REBIND_KEYS,
    screen: ONBOARDING_SCREENS.SETTINGS,
    title: 'Pick your own keys',
    description:
      'Click a key in Keyboard and press its replacement to rebind Focus or Verify. Reset all restores the defaults.',
    anchor: { selector: 'section[aria-label="Keyboard"]' },
  },
  {
    id: ONBOARDING_STEPS.DONE,
    screen: ONBOARDING_SCREENS.SETTINGS,
    title: 'You are ready',
    description:
      'Keep reviewing your own changes with Focus, findings, and export. You can start this guide again any time from Replay onboarding guide in Settings.',
    anchor: { selector: '[data-onboarding-replay]' },
  },
];

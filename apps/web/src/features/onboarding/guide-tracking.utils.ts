import { matchMutation } from '@tanstack/react-query';
import type { Mutation, MutationKey } from '@tanstack/react-query';
import z from 'zod';

import { ONBOARDING_ITEMS, ONBOARDING_SCREENS } from '@chaff/common/enums/onboarding.enums';
import type { OnboardingItem } from '@chaff/common/enums/onboarding.enums';
import { FINDING_STATUSES, findingStatusSchema, UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';
import { setMarksInputSchema } from '@chaff/server-contract/contract/reviews.contract';
import type { settingsSchema } from '@chaff/server-contract/contract/settings.contract';

import { CARD_VIEWS, cardViewsEnumwaii } from '@~/features/focus/focus.enums';
import type { CardView } from '@~/features/focus/focus.enums';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { screenForPath } from './onboarding.utils';

interface iMutationItems {
  key: MutationKey;
  items: (variables: unknown) => readonly OnboardingItem[];
}

export interface iGuideLocation {
  pathname: string;
  search: Record<string, unknown>;
}

const MARK_ITEMS = new Map<UnitMark, OnboardingItem>([
  [UNIT_MARKS.LOOKS_GOOD, ONBOARDING_ITEMS.LOOKS_GOOD],
  [UNIT_MARKS.LATER, ONBOARDING_ITEMS.LATER],
  [UNIT_MARKS.SKIPPED, ONBOARDING_ITEMS.SKIP],
]);

const CUSTOMIZING_SETTINGS: readonly (keyof typeof settingsSchema.shape)[] = [
  'theme',
  'accent',
  'codeSize',
  'codeFont',
  'codeLineHeight',
  'density',
  'syntaxLight',
  'syntaxDark',
  'shortcuts',
];

const INSIGHT_VIEWS = new Set<CardView>([CARD_VIEWS.diagram, CARD_VIEWS.usages]);

const statusInputSchema = z.object({ status: findingStatusSchema });

function always(item: OnboardingItem) {
  return () => [item];
}

function markItems(variables: unknown) {
  const input = setMarksInputSchema.safeParse(variables);
  if (!input.success) return [];
  return [...new Set(input.data.marks.flatMap(({ mark }) => (mark ? (MARK_ITEMS.get(mark) ?? []) : [])))];
}

function settingsItems(variables: unknown) {
  const isCustomizing =
    typeof variables === 'object' &&
    variables !== null &&
    CUSTOMIZING_SETTINGS.some((key) => key in variables && Reflect.get(variables, key) !== undefined);
  return isCustomizing ? [ONBOARDING_ITEMS.CUSTOMIZE] : [];
}

function verifyItems(variables: unknown) {
  const input = statusInputSchema.safeParse(variables);
  return input.success && input.data.status === FINDING_STATUSES.VERIFIED ? [ONBOARDING_ITEMS.VERIFY] : [];
}

const { changeUnits } = tanstackRPC;

const MUTATION_ITEMS: readonly iMutationItems[] = [
  { key: tanstackRPC.workspaces.add.mutationKey(), items: always(ONBOARDING_ITEMS.ADD_REPOSITORY) },
  { key: tanstackRPC.reviews.start.mutationKey(), items: always(ONBOARDING_ITEMS.START_REVIEW) },
  { key: tanstackRPC.codeHosts.startChange.mutationKey(), items: always(ONBOARDING_ITEMS.START_REVIEW) },
  { key: tanstackRPC.digests.start.mutationKey(), items: always(ONBOARDING_ITEMS.DIGEST) },
  { key: tanstackRPC.reviews.setMarks.mutationKey(), items: markItems },
  { key: tanstackRPC.findings.create.mutationKey(), items: always(ONBOARDING_ITEMS.NOTE) },
  { key: tanstackRPC.findings.setSeverity.mutationKey(), items: always(ONBOARDING_ITEMS.FINDINGS) },
  { key: tanstackRPC.findings.suggestTask.mutationKey(), items: always(ONBOARDING_ITEMS.FINDINGS) },
  { key: tanstackRPC.findings.setStatus.mutationKey(), items: verifyItems },
  { key: tanstackRPC.exports.post.mutationKey(), items: always(ONBOARDING_ITEMS.OUTPUT) },
  { key: tanstackRPC.settings.update.mutationKey(), items: settingsItems },
  { key: tanstackRPC.reviews.refresh.mutationKey(), items: always(ONBOARDING_ITEMS.SECOND_PASS) },
  ...[
    changeUnits.create,
    changeUnits.moveUnits,
    changeUnits.merge,
    changeUnits.rename,
    changeUnits.reorder,
    changeUnits.remove,
    changeUnits.useDigest,
  ].map((procedure) => ({ key: procedure.mutationKey(), items: always(ONBOARDING_ITEMS.PROGRESSION) })),
];

/** Checklist items a successful mutation completes. */
export function itemsFromMutation(mutation: Mutation<unknown, unknown>) {
  const entry = MUTATION_ITEMS.find(({ key }) => matchMutation({ mutationKey: key, exact: true }, mutation));
  return entry ? entry.items(mutation.state.variables) : [];
}

/** Checklist items completed by arriving at `current`, given the location before it. */
export function itemsFromRoute(previous: iGuideLocation | undefined, current: iGuideLocation) {
  const screen = screenForPath(current.pathname);
  const items: OnboardingItem[] = [];
  if (screen === ONBOARDING_SCREENS.FULL_DIFF) items.push(ONBOARDING_ITEMS.FULL_DIFF);
  if (screen === ONBOARDING_SCREENS.HISTORY) items.push(ONBOARDING_ITEMS.HISTORY);
  if (screen !== ONBOARDING_SCREENS.FOCUS) return items;
  const { view } = current.search;
  if (cardViewsEnumwaii.is(view) && INSIGHT_VIEWS.has(view)) items.push(ONBOARDING_ITEMS.DIAGRAM);
  if (previous?.pathname === current.pathname && previous.search.progression !== current.search.progression)
    items.push(ONBOARDING_ITEMS.PROGRESSION);
  return items;
}

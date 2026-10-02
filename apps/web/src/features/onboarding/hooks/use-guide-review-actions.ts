import { matchMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { ONBOARDING_STEPS } from '@chaff/common/enums/onboarding.enums';
import { setMarksInputSchema, setMarksResultSchema } from '@chaff/server-contract/contract/reviews.contract';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { ONBOARDING_DECISION_MARKS } from '../guide-actions.constants';
import { ONBOARDING_MUTATION_STATUSES } from '../onboarding.enums';
import type { iOnboardingState } from '../onboarding.types';

const marksMutationOptions = tanstackRPC.reviews.setMarks.mutationOptions();
const findingMutationOptions = tanstackRPC.findings.create.mutationOptions();

export function useGuideReviewActions(state: iOnboardingState, isActive: boolean, onAction: () => unknown) {
  const queryClient = useQueryClient();
  const latest = useRef(onAction);
  useEffect(() => {
    latest.current = onAction;
  }, [onAction]);
  useEffect(() => {
    if (!isActive || !state.reviewId) return undefined;
    const startedAt = Date.now();
    const seen = new WeakSet<object>();
    return queryClient.getMutationCache().subscribe((event) => {
      const { mutation } = event;
      if (
        mutation?.state.status !== ONBOARDING_MUTATION_STATUSES.success ||
        mutation.state.submittedAt < startedAt ||
        seen.has(mutation)
      )
        return;
      if (matchMutation({ mutationKey: marksMutationOptions.mutationKey, exact: true }, mutation)) {
        const input = setMarksInputSchema.safeParse(mutation.state.variables);
        const result = setMarksResultSchema.safeParse(mutation.state.data);
        if (!input.success || input.data.snapshotId !== state.reviewId || !result.success) return;
        const expected = ONBOARDING_DECISION_MARKS.get(state.step);
        if (state.step !== ONBOARDING_STEPS.SWIPE && (!expected || !result.data.some((mark) => mark.mark === expected)))
          return;
      } else if (matchMutation({ mutationKey: findingMutationOptions.mutationKey, exact: true }, mutation)) {
        if (state.step !== ONBOARDING_STEPS.COMMENT && state.step !== ONBOARDING_STEPS.SWIPE) return;
        const input = mutation.state.variables;
        if (
          typeof input !== 'object' ||
          input === null ||
          !('snapshotId' in input) ||
          input.snapshotId !== state.reviewId
        )
          return;
      } else return;
      seen.add(mutation);
      latest.current();
    });
  }, [queryClient, isActive, state.step, state.reviewId]);
}

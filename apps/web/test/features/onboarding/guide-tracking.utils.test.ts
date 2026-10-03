import { describe, expect, it, vi } from 'vitest';

import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';

import { itemsFromRoute } from '@~/features/onboarding/guide-tracking.utils';

vi.mock('@~/utils/orpc', () => ({
  default: new Proxy({}, { get: () => new Proxy({}, { get: () => vi.fn() }) }),
}));

const FOCUS = '/reviews/review';

describe('items checked off by where the user goes', () => {
  it('counts opening a diagram or usages on a Focus card, not the code view', () => {
    expect(itemsFromRoute(undefined, { pathname: FOCUS, search: { view: 'diagram' } })).toEqual([
      ONBOARDING_ITEMS.DIAGRAM,
    ]);
    expect(itemsFromRoute(undefined, { pathname: FOCUS, search: { view: 'usages' } })).toEqual([
      ONBOARDING_ITEMS.DIAGRAM,
    ]);
    expect(itemsFromRoute(undefined, { pathname: FOCUS, search: { view: 'code' } })).toEqual([]);
  });

  it('counts a progression switch on the same review, but not arriving on a review in another progression', () => {
    const before = { pathname: FOCUS, search: {} };
    expect(itemsFromRoute(before, { pathname: FOCUS, search: { progression: 'functions' } })).toEqual([
      ONBOARDING_ITEMS.PROGRESSION,
    ]);
    expect(
      itemsFromRoute({ pathname: '/', search: {} }, { pathname: FOCUS, search: { progression: 'functions' } }),
    ).toEqual([]);
  });

  it('counts opening the Full diff and History', () => {
    expect(itemsFromRoute(undefined, { pathname: `${FOCUS}/diff`, search: {} })).toEqual([ONBOARDING_ITEMS.FULL_DIFF]);
    expect(itemsFromRoute(undefined, { pathname: '/history', search: {} })).toEqual([ONBOARDING_ITEMS.HISTORY]);
    expect(itemsFromRoute(undefined, { pathname: `${FOCUS}/export`, search: {} })).toEqual([]);
  });
});

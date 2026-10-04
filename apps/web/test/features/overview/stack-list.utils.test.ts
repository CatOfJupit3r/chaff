import { describe, expect, it } from 'vitest';

import { DEFAULT_STACK_FILTERS } from '@chaff/common/constants/stack-filters.constants';
import { CODE_HOSTS } from '@chaff/common/enums/code-host.enums';
import { STACK_ACTIVITIES, STACK_REVIEW_FILTERS, STACK_SOURCES } from '@chaff/common/enums/stack-filters.enums';

import { INCLUSIVE_STACK_FILTERS } from '@~/features/overview/overview.constants';
import type { iOverviewStack } from '@~/features/overview/overview.types';
import { activeFilterCount, listStacks } from '@~/features/overview/stack-list.utils';

import { reviewTarget, snapshotSummary } from '../reviews/review-fixtures';
import { branch, workspace } from '../workspaces/workspace-fixtures';

const NOW = new Date('2026-10-04T12:00:00Z').getTime();

function stack(name: string, committedAt: string, overrides: Partial<iOverviewStack['branches'][number]> = {}) {
  return {
    id: name,
    title: name,
    tipBranch: name,
    workspace,
    hasCycle: false,
    branches: [{ name, title: name, local: branch(name, { committedAt: new Date(committedAt) }), ...overrides }],
  } satisfies iOverviewStack;
}

const fresh = stack('fresh', '2026-10-02T12:00:00Z');
const stale = stack('stale', '2026-06-01T12:00:00Z');
const reviewed = stack('reviewed', '2026-10-01T12:00:00Z', {
  target: reviewTarget('reviewed', {
    latestSnapshot: snapshotSummary('2026-10-01', { regionCount: 4, accountedRegionCount: 4 }),
  }),
});
const requested = stack('requested', '2026-10-03T12:00:00Z', {
  change: { host: CODE_HOSTS.GITLAB, project: 'group/project', number: 7, title: 'Requested', webUrl: '' },
});
const theirs = stack('theirs', '2026-10-03T18:00:00Z', {
  local: branch('theirs', { committedAt: new Date('2026-10-03T18:00:00Z'), isAuthoredByUser: false }),
});
const stacks = [stale, fresh, reviewed, requested, theirs];

function names(result: ReturnType<typeof listStacks>) {
  return result.listed.map(({ stack: listed }) => listed.tipBranch);
}

function list(overrides: Partial<Parameters<typeof listStacks>[0]> = {}) {
  return listStacks({
    stacks,
    filters: DEFAULT_STACK_FILTERS,
    hiddenStacks: [],
    query: '',
    isShowingHidden: false,
    now: NOW,
    ...overrides,
  });
}

describe('stack list', () => {
  it('lists recently active stacks newest first and counts the stale ones it leaves out', () => {
    const result = list();
    expect(names(result)).toEqual(['theirs', 'requested', 'fresh', 'reviewed']);
    expect(result.filteredCount).toBe(1);
  });

  it('narrows by review state, source and authorship', () => {
    const filters = { ...INCLUSIVE_STACK_FILTERS };
    expect(names(list({ filters: { ...filters, review: STACK_REVIEW_FILTERS.REVIEWED } }))).toEqual(['reviewed']);
    expect(names(list({ filters: { ...filters, review: STACK_REVIEW_FILTERS.TO_REVIEW } }))).not.toContain('reviewed');
    expect(names(list({ filters: { ...filters, source: STACK_SOURCES.CHANGE_REQUESTS } }))).toEqual(['requested']);
    expect(names(list({ filters: { ...filters, source: STACK_SOURCES.LOCAL } }))).not.toContain('requested');
    expect(names(list({ filters: { ...filters, isMineOnly: true } }))).not.toContain('theirs');
  });

  it('keeps hidden stacks out until they are shown, and counts them', () => {
    const hidden = list({ hiddenStacks: ['fresh'] });
    expect(names(hidden)).not.toContain('fresh');
    expect(hidden.hiddenCount).toBe(1);

    const shown = list({ hiddenStacks: ['fresh'], isShowingHidden: true });
    expect(shown.listed.find(({ stack: listed }) => listed.tipBranch === 'fresh')).toMatchObject({ isHidden: true });
  });

  it('searches hidden and stale stacks too', () => {
    expect(names(list({ query: 'stale' }))).toEqual(['stale']);
    expect(names(list({ query: 'fresh', hiddenStacks: ['fresh'] }))).toEqual(['fresh']);
  });

  it('counts only the filters that leave stacks out', () => {
    expect(activeFilterCount(INCLUSIVE_STACK_FILTERS)).toBe(0);
    expect(activeFilterCount(DEFAULT_STACK_FILTERS)).toBe(1);
    expect(activeFilterCount({ ...INCLUSIVE_STACK_FILTERS, activity: STACK_ACTIVITIES.WEEK, isMineOnly: true })).toBe(
      2,
    );
  });
});

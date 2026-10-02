import { describe, expect, it } from 'vitest';

import { CODE_HOSTS } from '@chaff/common/enums/code-host.enums';
import { FINDING_STATUSES } from '@chaff/common/enums/review.enums';

import { countForFilter, exportTabLabel, statusesFor, toggleFilter } from '@~/features/exports/export.utils';
import { EXPORT_INCLUDE_FILTERS, EXPORT_TABS } from '@~/features/exports/exports.enums';
import { FINDING_FILTERS } from '@~/features/findings/findings.enums';

describe('statusesFor', () => {
  it('expands status groups into the statuses they stand for, once each', () => {
    expect(statusesFor([FINDING_FILTERS.open, FINDING_FILTERS.verified, FINDING_FILTERS.open])).toEqual([
      FINDING_STATUSES.OPEN,
      FINDING_STATUSES.REOPENED,
      FINDING_STATUSES.ANSWERED,
      FINDING_STATUSES.VERIFIED,
      FINDING_STATUSES.CLOSED,
    ]);
  });
});

describe('countForFilter', () => {
  it('adds up the statuses in a group', () => {
    const counts = [
      { status: FINDING_STATUSES.OPEN, count: 2 },
      { status: FINDING_STATUSES.REOPENED, count: 1 },
      { status: FINDING_STATUSES.VERIFIED, count: 4 },
    ];
    expect(countForFilter(counts, FINDING_FILTERS.open)).toBe(3);
    expect(countForFilter(counts, FINDING_FILTERS.outdated)).toBe(0);
  });
});

describe('toggleFilter', () => {
  it('adds or removes a group and keeps the offered order', () => {
    const order = EXPORT_INCLUDE_FILTERS;
    expect(toggleFilter([FINDING_FILTERS.verified], FINDING_FILTERS.open, order)).toEqual([
      FINDING_FILTERS.open,
      FINDING_FILTERS.verified,
    ]);
    expect(toggleFilter([FINDING_FILTERS.open, FINDING_FILTERS.verified], FINDING_FILTERS.open, order)).toEqual([
      FINDING_FILTERS.verified,
    ]);
  });
});

describe('exportTabLabel', () => {
  it('names the host and its own tool on the posting tabs', () => {
    expect(exportTabLabel(EXPORT_TABS.post, CODE_HOSTS.GITLAB)).toBe('GitLab drafts');
    expect(exportTabLabel(EXPORT_TABS.cli, CODE_HOSTS.GITHUB)).toBe('gh');
    expect(exportTabLabel(EXPORT_TABS.cli, CODE_HOSTS.GITLAB)).toBe('glab');
  });
});

import { FINDING_KINDS, FINDING_SCOPES, FINDING_STATUSES } from '@chaff/common/enums/review.enums';

import type { iFinding } from '@~/features/findings/findings.types';

/** An open concern on code, with no anchors unless given. */
export function findingFixture(overrides: Partial<iFinding> = {}): iFinding {
  return {
    id: crypto.randomUUID(),
    number: 1,
    kind: FINDING_KINDS.CONCERN,
    scope: FINDING_SCOPES.CODE,
    status: FINDING_STATUSES.OPEN,
    body: 'Why does this helper exist?\nIt only reads one field.',
    workspaceId: 'w',
    targetId: 't',
    branch: 'feature',
    parentBranch: 'main',
    snapshotId: 's',
    anchors: [],
    events: [],
    replies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

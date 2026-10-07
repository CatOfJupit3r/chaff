import { singleton } from 'tsyringe';

import type { stackBranches, stacks } from '@~/db/schema/stacks.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iStackMemberRecord, iStackRecord } from './stacks.types';

type StackRow = typeof stacks.$inferSelect;
type StackBranchRow = typeof stackBranches.$inferSelect;

@singleton()
export class StackResolver {
  public toStackMember = createRowResolver<StackBranchRow, iStackMemberRecord>({
    optional: ['keptHostParent'],
    omit: ['id', 'stackId', 'workspaceId', 'position'],
  });

  private toStackRow = createRowResolver<StackRow, Omit<iStackRecord, 'branches'>>({ optional: ['baseBranch'] });

  /** The stack with its branches, which must come bottom first. */
  public toStackRecord(row: StackRow, branchRows: readonly StackBranchRow[]) {
    return { ...this.toStackRow(row), branches: branchRows.map((branchRow) => this.toStackMember(branchRow)) };
  }
}

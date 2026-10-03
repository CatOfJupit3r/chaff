import { container } from 'tsyringe';

import { ChangeUnitsService } from '@~/features/reviews/change-units/change-units.service';
import { base, procedure } from '@~/lib/orpc';

export const changeUnitsRouter = base.changeUnits.router({
  list: procedure.changeUnits.list.handler(async ({ input }) =>
    container.resolve(ChangeUnitsService).list(input.snapshotId),
  ),

  create: procedure.changeUnits.create.handler(async ({ input }) =>
    container.resolve(ChangeUnitsService).create(input),
  ),

  moveUnits: procedure.changeUnits.moveUnits.handler(async ({ input }) =>
    container.resolve(ChangeUnitsService).moveUnits(input),
  ),

  merge: procedure.changeUnits.merge.handler(async ({ input }) => container.resolve(ChangeUnitsService).merge(input)),

  rename: procedure.changeUnits.rename.handler(async ({ input }) =>
    container.resolve(ChangeUnitsService).rename(input),
  ),

  reorder: procedure.changeUnits.reorder.handler(async ({ input }) =>
    container.resolve(ChangeUnitsService).reorder(input),
  ),

  remove: procedure.changeUnits.remove.handler(async ({ input }) =>
    container.resolve(ChangeUnitsService).remove(input),
  ),

  useDigest: procedure.changeUnits.useDigest.handler(async ({ input }) =>
    container.resolve(ChangeUnitsService).useDigest(input.snapshotId),
  ),
});

import { oc } from '@orpc/contract';
import z from 'zod';

import { changeUnitSourceSchema } from '@chaff/common/enums/review.enums';

const idSchema = z.string().min(1).max(64);
const titleSchema = z.string().trim().min(1).max(200);
const unitIdsSchema = z.array(idSchema).min(1).max(5000);

export const changeUnitSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: changeUnitSourceSchema,
  /** The digest group it started from; the card shows that group's explanation. */
  digestGroupId: z.string().optional(),
  /** Function and Section units, in the order the change reads them. */
  unitIds: z.array(z.string()),
});

const changeUnitListSchema = z.array(changeUnitSchema);
const snapshotIdInput = z.object({ snapshotId: idSchema });

export const changeUnitsContract = oc.router({
  list: oc
    .route({
      summary: "List a snapshot's Change units",
      description:
        'Returns the Change units in order. A unit is in at most one; units in none are reviewed on their own.',
    })
    .input(snapshotIdInput)
    .output(changeUnitListSchema),

  create: oc
    .route({
      summary: 'Make a Change unit',
      description:
        'Groups the units into a new Change unit, taking them out of any other. Placed after `afterChangeUnitId`, which splits that change, or at the end. Returns the whole list.',
    })
    .input(
      snapshotIdInput.extend({ title: titleSchema, unitIds: unitIdsSchema, afterChangeUnitId: idSchema.optional() }),
    )
    .output(changeUnitListSchema),

  moveUnits: oc
    .route({
      summary: 'Move units between Change units',
      description:
        'Adds the units to the end of a Change unit, or takes them out of every change when `changeUnitId` is null. A change left empty is removed. Returns the whole list.',
    })
    .input(snapshotIdInput.extend({ unitIds: unitIdsSchema, changeUnitId: idSchema.nullable() }))
    .output(changeUnitListSchema),

  merge: oc
    .route({
      summary: 'Merge Change units',
      description: 'Folds the changes into the first of them in list order. Returns the whole list.',
    })
    .input(snapshotIdInput.extend({ changeUnitIds: z.array(idSchema).min(2).max(500), title: titleSchema.optional() }))
    .output(changeUnitListSchema),

  rename: oc
    .route({ summary: 'Rename a Change unit', description: 'Returns the whole list.' })
    .input(snapshotIdInput.extend({ changeUnitId: idSchema, title: titleSchema }))
    .output(changeUnitListSchema),

  reorder: oc
    .route({
      summary: 'Reorder Change units',
      description: 'Puts the named changes first in the given order; the rest keep their order after them.',
    })
    .input(snapshotIdInput.extend({ changeUnitIds: z.array(idSchema).min(1).max(500) }))
    .output(changeUnitListSchema),

  remove: oc
    .route({
      summary: 'Ungroup a Change unit',
      description: 'Removes the change; its units are reviewed on their own again. Marks are kept.',
    })
    .input(snapshotIdInput.extend({ changeUnitId: idSchema }))
    .output(changeUnitListSchema),

  useDigest: oc
    .route({
      summary: "Use the digest's groups",
      description: "Replaces the snapshot's Change units with the groups of its newest ready digest.",
    })
    .input(snapshotIdInput)
    .output(changeUnitListSchema),
});

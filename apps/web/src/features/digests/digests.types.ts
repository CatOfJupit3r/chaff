import type z from 'zod';

import type { digestPartRefSchema, digestStartOptionsSchema } from '@chaff/server-contract/contract/digests.contract';

import type { ORPCOutputs } from '@~/utils/orpc';

export type iDigest = NonNullable<ORPCOutputs['digests']['get']>;

export type iDigestContent = NonNullable<iDigest['content']>;

export type iDigestUnitNote = iDigestContent['units'][number];

export type iDigestGroup = iDigestContent['groups'][number];

export type iDigestDiagram = iDigestContent['diagrams'][number];

export type iDigestTest = iDigestUnitNote['tests'][number];

/** A version of one part written on the reviewer's instructions. */
export type iDigestRevision = iDigest['revisions'][number];

/** The overview, one unit's note by unit id, or one diagram by its id. */
export type iDigestPartRef = z.infer<typeof digestPartRefSchema>;

export type iDigestRunnerStatus = ORPCOutputs['digests']['runners'][number];

/** The model and extra instructions for one digest. */
export type iDigestStartOptions = z.infer<typeof digestStartOptionsSchema>;

/** The model each runner writes digests with, as remembered in settings. */
export type iDigestModels = ORPCOutputs['settings']['get']['digestModels'];

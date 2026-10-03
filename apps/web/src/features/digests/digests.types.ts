import type z from 'zod';

import type { digestStartOptionsSchema } from '@chaff/server-contract/contract/digests.contract';

import type { ORPCOutputs } from '@~/utils/orpc';

export type iDigest = NonNullable<ORPCOutputs['digests']['get']>;

export type iDigestContent = NonNullable<iDigest['content']>;

export type iDigestUnitNote = iDigestContent['units'][number];

export type iDigestGroup = iDigestContent['groups'][number];

export type iDigestDiagram = iDigestContent['diagrams'][number];

export type iDigestTest = iDigestUnitNote['tests'][number];

export type iDigestRunnerStatus = ORPCOutputs['digests']['runners'][number];

/** The model and extra instructions for one digest. */
export type iDigestStartOptions = z.infer<typeof digestStartOptionsSchema>;

/** The model each runner writes digests with, as remembered in settings. */
export type iDigestModels = ORPCOutputs['settings']['get']['digestModels'];

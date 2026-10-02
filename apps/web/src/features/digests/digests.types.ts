import type { ORPCInputs, ORPCOutputs } from '@~/utils/orpc';

/** What can be chosen when starting a digest: the agent, its model and extra instructions. */
export type iDigestStartOptions = Omit<ORPCInputs['digests']['start'], 'snapshotId'>;

export type iDigest = NonNullable<ORPCOutputs['digests']['get']>;

export type iDigestContent = NonNullable<iDigest['content']>;

export type iDigestUnitNote = iDigestContent['units'][number];

export type iDigestGroup = iDigestContent['groups'][number];

export type iDigestDiagram = iDigestContent['diagrams'][number];

export type iDigestTest = iDigestUnitNote['tests'][number];

export type iDigestRunnerStatus = ORPCOutputs['digests']['runners'][number];

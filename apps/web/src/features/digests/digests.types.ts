import type { ORPCOutputs } from '@~/utils/orpc';

export type iDigest = NonNullable<ORPCOutputs['digests']['get']>;

export type iDigestContent = NonNullable<iDigest['content']>;

export type iDigestUnitNote = iDigestContent['units'][number];

export type iDigestGroup = iDigestContent['groups'][number];

export type iDigestDiagram = iDigestContent['diagrams'][number];

export type iDigestTest = iDigestUnitNote['tests'][number];

export type iDigestRunnerStatus = ORPCOutputs['digests']['runners'][number];

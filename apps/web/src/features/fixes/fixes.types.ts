import type { ORPCOutputs } from '@~/utils/orpc';

export type iFix = ORPCOutputs['fixes']['list'][number];

export type iFixFile = iFix['files'][number];

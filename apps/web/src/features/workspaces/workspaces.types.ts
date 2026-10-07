import type { ORPCOutputs } from '@~/utils/orpc';

export type iWorkspace = ORPCOutputs['workspaces']['list'][number];

export type iBranch = ORPCOutputs['workspaces']['branches'][number];

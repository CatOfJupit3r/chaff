import type { ORPCOutputs } from '@~/utils/orpc';

export type iFinding = ORPCOutputs['findings']['list'][number];

export type iFindingAnchor = iFinding['anchors'][number];

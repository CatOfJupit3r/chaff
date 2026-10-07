import type { ORPCOutputs } from '@~/utils/orpc';

export type iStack = ORPCOutputs['stacks']['list'][number];

export type iStackMember = iStack['branches'][number];

export type iStackSuggestion = ORPCOutputs['stacks']['suggest'][number];

export type iStackImport = ORPCOutputs['stacks']['importable'][number];

export type iStackHostChange = ORPCOutputs['stacks']['hostChanges'][number];

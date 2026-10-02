import type { ORPCOutputs } from '@~/utils/orpc';

export type iConnection = ORPCOutputs['codeHosts']['connections'][number];

export type iInboxProject = ORPCOutputs['codeHosts']['inbox'][number];

export type iRemoteChange = iInboxProject['changes'][number];

export type iDiscussion = ORPCOutputs['codeHosts']['discussions'][number];

export type iWorkspaceRemote = ORPCOutputs['codeHosts']['workspaceRemote'];

export type iChangeRequestInfo = NonNullable<ORPCOutputs['reviews']['snapshot']['change']>;

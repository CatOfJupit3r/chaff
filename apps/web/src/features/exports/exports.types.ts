import type { ORPCOutputs } from '@~/utils/orpc';

export type iExportPacket = ORPCOutputs['exports']['packet'];

export type iPostingPreview = ORPCOutputs['exports']['postingPreview'];

export type iPostingItem = iPostingPreview['items'][number];

export type iReportResult = ORPCOutputs['findings']['importReport'];

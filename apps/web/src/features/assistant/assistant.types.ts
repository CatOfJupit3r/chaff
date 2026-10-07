import type { ORPCInputs, ORPCOutputs } from '@~/utils/orpc';

/** One question asked about a card, and the agent's answer. */
export type iAssistantExchange = ORPCOutputs['assistant']['thread'][number];

/** The card a thread belongs to, and what the agent is told about it. */
export type iAssistantCard = Pick<ORPCInputs['assistant']['ask'], 'snapshotId' | 'cardId' | 'cardTitle' | 'unitIds'>;

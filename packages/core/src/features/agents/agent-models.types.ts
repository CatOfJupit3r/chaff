import type z from 'zod';

import type { agentModelSchema } from '@chaff/server-contract/contract/digests.contract';

export type iAgentModel = z.infer<typeof agentModelSchema>;

import { oc } from '@orpc/contract';
import z from 'zod';

import { digestRunnerSchema } from '@chaff/common/enums/digest.enums';

/** How a coding agent starts the bridge to this app. */
export const agentBridgeSchema = z.object({
  /** Name the agent lists the server under: `chaff`, or `chaff-dev` for the development app. */
  serverName: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string(), z.string()),
});

const agentAccessStatusSchema = z.object({
  /** Missing when this app cannot be reached by agents, such as in tests. */
  bridge: agentBridgeSchema.optional(),
  /** The agent that connected most recently since the app started. */
  lastConnection: z.object({ clientName: z.string(), connectedAt: z.date() }).optional(),
  agents: z.array(
    z.object({
      runner: digestRunnerSchema,
      /** The agent's CLI was found on this computer. */
      isAvailable: z.boolean(),
      /** The agent already lists the Chaff server. */
      isAdded: z.boolean(),
    }),
  ),
});

export const agentAccessContract = oc.router({
  status: oc
    .route({
      summary: 'Agent access status',
      description:
        'How coding agents start the bridge to this app, which agent connected last, and whether Claude Code and Codex are installed and already list the Chaff server.',
    })
    .output(agentAccessStatusSchema),

  addToAgent: oc
    .route({
      summary: 'Add Chaff to a coding agent',
      description:
        "Runs the agent's own `mcp add` for the user, outside any repository, so the agent lists the Chaff server; does nothing when it already does.",
    })
    .input(z.object({ runner: digestRunnerSchema }))
    .output(agentAccessStatusSchema),
});

import { oc } from '@orpc/contract';
import z from 'zod';

const appInfoSchema = z.object({
  version: z.string(),
  dataDir: z.string(),
  gitVersion: z.string().nullable(),
  platform: z.string(),
});

export const appContract = oc.router({
  info: oc
    .route({
      summary: 'App and environment info',
      description: 'Returns the Chaff version, where it keeps its data, and the version of the installed git.',
    })
    .output(appInfoSchema),
});

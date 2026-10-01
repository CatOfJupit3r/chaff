import { base, publicProcedure } from '@~/lib/orpc';

export const indexRouter = base.index.router({
  healthCheck: publicProcedure.index.healthCheck.handler(async () => ({ status: 'OK' })),
});

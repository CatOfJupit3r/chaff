import { base } from '../lib/orpc';
import { indexRouter } from './index.router';

export const appRouter = base.router({
  index: indexRouter,
});

export type AppRouter = typeof appRouter;

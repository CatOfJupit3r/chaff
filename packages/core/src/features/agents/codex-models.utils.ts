import z from 'zod';

import { digestModelSchema } from '@chaff/server-contract/contract/digests.contract';

import type { iAgentModel } from './agent-models.types';

/** The part of `codex debug models` Chaff reads; the catalog carries much more per model. */
const codexCatalogSchema = z.object({
  models: z.array(
    z.object({
      slug: z.string(),
      display_name: z.string().optional(),
      description: z.string().optional(),
      visibility: z.string().optional(),
      priority: z.number().optional(),
    }),
  ),
});

/** Codex only offers models it lists; hidden ones are for its own use. */
const LISTED_VISIBILITY = 'list';

/** The models Codex shows in its own picker, in its order; undefined when the output isn't a catalog. */
export function parseCodexModels(output: string): iAgentModel[] | undefined {
  let json: unknown;
  try {
    json = JSON.parse(output);
  } catch {
    return undefined;
  }
  const catalog = codexCatalogSchema.safeParse(json);
  if (!catalog.success) return undefined;
  return catalog.data.models
    .filter((model) => model.visibility === LISTED_VISIBILITY && digestModelSchema.safeParse(model.slug).success)
    .toSorted((left, right) => (left.priority ?? Infinity) - (right.priority ?? Infinity))
    .map((model) => ({ id: model.slug, label: model.display_name ?? model.slug, description: model.description }));
}

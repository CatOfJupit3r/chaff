import z from 'zod';

import type { iDigestPreview } from './digests.types';

const partialDigestSchema = z.looseObject({
  overview: z.string().optional(),
  groups: z.array(z.looseObject({ title: z.string().optional() })).optional(),
  units: z.array(z.unknown()).optional(),
  diagrams: z.array(z.unknown()).optional(),
});

/** What can be shown of an answer still being written; undefined until its overview has started. */
export function previewOf(partial: unknown, unitCount: number): iDigestPreview | undefined {
  const parsed = partialDigestSchema.safeParse(partial);
  if (!parsed.success || !parsed.data.overview) return undefined;
  const { overview, groups = [], units = [], diagrams = [] } = parsed.data;
  return {
    overview: overview.trim(),
    groupTitles: groups.flatMap((group) => (group.title?.trim() ? [group.title.trim()] : [])),
    noteCount: Math.min(units.length, unitCount),
    unitCount,
    diagramCount: diagrams.length,
  };
}

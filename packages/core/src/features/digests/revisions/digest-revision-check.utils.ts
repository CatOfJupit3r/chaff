import { checkDiagram, checkUnitNote } from '@~/features/digests/digest-check.utils';
import { agentDiagramSchema } from '@~/features/digests/digest-output.schema';

import { agentOverviewSchema, agentRevisedNoteSchema } from './digest-revision-output.schema';
import type { iRevisedPart } from './digest-revisions.types';

/**
 * The agent's rewrite of `current`, checked as the digest's own parts are and keeping the part's key; undefined
 * when the answer is not that part or is empty.
 */
export async function checkRevisedPart(
  current: iRevisedPart,
  answer: unknown,
  shortIds: ReadonlyMap<string, string>,
  root: string,
): Promise<iRevisedPart | undefined> {
  if ('overview' in current) {
    const parsed = agentOverviewSchema.safeParse(answer);
    const overview = parsed.success ? parsed.data.overview.trim() : '';
    return overview ? { part: current.part, overview } : undefined;
  }
  if ('note' in current) {
    const parsed = agentRevisedNoteSchema.safeParse(answer);
    if (!parsed.success) return undefined;
    const note = await checkUnitNote(parsed.data, current.note.unitId, root);
    return note.summary ? { part: current.part, note } : undefined;
  }
  const parsed = agentDiagramSchema.safeParse(answer);
  if (!parsed.success) return undefined;
  const diagram = checkDiagram(parsed.data, current.diagram.id, shortIds);
  return diagram ? { part: current.part, diagram } : undefined;
}

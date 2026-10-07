import { Listener } from './listener.class';

export interface iFindingsChanged {
  findingIds: string[];
}

/** A reply or a coding agent's report changed these findings. */
export const FINDINGS_CHANGED = new Listener<iFindingsChanged>('findings.changed');

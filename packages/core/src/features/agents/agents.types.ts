import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import type { iDigestRunnerAdapter } from '@~/features/digests/digests.types';

/** Where a coding agent works: a checkout of the snapshot's head and, outside it, scratch space and the diffs. */
export interface iAgentCheckout {
  checkout: string;
  scratchDir: string;
  /** Every changed file's diff, and the whole branch's, inside `scratchDir`. */
  diffDirectory: string;
  /** The whole branch's diff. */
  patch: string;
}

/** The coding agent picked in Settings, ready to start. */
export interface iPickedAgent {
  runner: DigestRunner;
  /** The model remembered for the runner; its own default when absent. */
  model?: string;
  /** The executable found on this computer. */
  command: string;
  adapter: iDigestRunnerAdapter;
}

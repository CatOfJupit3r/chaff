import { SectionLabel } from '@~/components/ui/section-label';
import type { iWorkspace } from '@~/features/workspaces/workspaces.types';

import { RepositoryPreferences } from './repository-preferences';

/** Project preferences per repository. Chaff never adds one by itself. */
export function PreferencesSection({ workspaces }: { workspaces: readonly iWorkspace[] }) {
  if (workspaces.length === 0) return null;

  return (
    <section aria-label="Preferences" className="flex flex-col gap-2.5">
      <SectionLabel>Preferences</SectionLabel>
      <p className="m-0 text-[12.5px] text-muted">
        Rules you want agents to follow in each repository. They go into AI digests, agent prompts and fixes.
      </p>
      {workspaces.map((workspace) => (
        <RepositoryPreferences key={workspace.id} workspace={workspace} />
      ))}
    </section>
  );
}

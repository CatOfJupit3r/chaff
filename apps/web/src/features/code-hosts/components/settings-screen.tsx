import { Screen } from '@~/components/layout/screen';
import { TopBar } from '@~/components/layout/top-bar';
import { List } from '@~/components/ui/list';
import { SectionLabel } from '@~/components/ui/section-label';
import { ReplayOnboarding } from '@~/features/onboarding/components/replay-onboarding';
import { PreferencesSection } from '@~/features/preferences/components/preferences-section';
import { AgentsSection } from '@~/features/settings/components/agents-section';
import { DiffLayoutSection } from '@~/features/settings/components/diff-layout-section';
import { ShortcutsSection } from '@~/features/settings/components/shortcuts-section';
import { RepositoriesGroup } from '@~/features/workspaces/components/repositories-group';
import { useAddWorkspace } from '@~/features/workspaces/hooks/use-add-workspace';
import { useWorkspaces } from '@~/features/workspaces/hooks/use-workspaces';

import { useConnections } from '../hooks/use-connections';
import { ConnectionsSection } from './connections-section';
import { RepositoryRemoteRow } from './repository-remote-row';

/**
 * Accounts on GitLab and GitHub, the project each repository reads its merge requests from, diff and layout
 * defaults, the coding agents, preferences and the keyboard map.
 */
export function SettingsScreen() {
  const workspaces = useWorkspaces();
  const connections = useConnections();
  const { addFromPicker, isAdding } = useAddWorkspace();

  return (
    <>
      <TopBar>
        <b className="font-medium text-fg">Settings</b>
      </TopBar>
      <Screen>
        <div className="mx-auto flex max-w-[980px] flex-col gap-7">
          <div>
            <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em]">Settings</h1>
            <p className="m-0 mt-1 text-muted">Saved on this computer. Tokens stay in your system keychain.</p>
          </div>
          <ConnectionsSection />
          <RepositoriesGroup workspaces={workspaces} onAdd={addFromPicker} isAdding={isAdding} />
          {workspaces.length > 0 ? (
            <section aria-label="Repository projects" className="flex flex-col gap-2.5">
              <SectionLabel>Repository projects</SectionLabel>
              <List>
                {workspaces.map((workspace) => (
                  <RepositoryRemoteRow key={workspace.id} workspace={workspace} connections={connections} />
                ))}
              </List>
            </section>
          ) : null}
          <DiffLayoutSection />
          <AgentsSection />
          <PreferencesSection workspaces={workspaces} />
          <ShortcutsSection />
          <ReplayOnboarding />
        </div>
      </Screen>
    </>
  );
}
